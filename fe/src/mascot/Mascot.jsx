import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, RoundedBox, Sparkles } from '@react-three/drei';
import {
  CatmullRomCurve3,
  DoubleSide,
  LatheGeometry,
  MathUtils,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { circuitTexture, dudiPatchTexture, duPatchTexture, roundedRectMask, ventTexture } from './textures';

// Kích thước khung mặt trắng và kính đen [rộng, cao, bo góc]
const FRAME = [1.46, 1.0, 0.36];
const VISOR = [1.22, 0.64, 0.28];

const RED = '#ED1C24'; // đỏ của logo DUDI
const WHITE = '#F1F2F6';
const EYE = '#3FE0FF';
const NEON = '#2F8BFF';

// Mũ là một ellipsoid, toạ độ tính trong hệ của đầu (gốc ở cổ)
const HELMET = { cy: 0.83, a: 1, b: 0.8, c: 0.9 };
const FACE_Y = 0.75;

function helmetZ(x, y) {
  const { cy, a, b, c } = HELMET;
  return c * Math.sqrt(Math.max(0.0001, 1 - (x / a) ** 2 - ((y - cy) / b) ** 2));
}

// Tấm lưới dày được uốn theo bề mặt mũ; hình bo góc được cắt bằng alphaMap
function conformedPanel(w, h, lift) {
  const geo = new PlaneGeometry(w, h, 96, 64);
  geo.translate(0, FACE_Y, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setZ(i, helmetZ(p.getX(i), p.getY(i)) + lift);
  }
  geo.computeVertexNormals();
  return geo;
}

// Đuôi: ống cong thon dần về chóp
function tailGeometry(curve) {
  const tubular = 64;
  const radial = 20;
  const geo = new TubeGeometry(curve, tubular, 0.12, radial, false);
  const p = geo.attributes.position;
  const v = new Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    const center = curve.getPointAt(t);
    const k = MathUtils.lerp(1, 0.06, t ** 1.6); // thon dần thành đầu nhọn
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      v.fromBufferAttribute(p, idx).sub(center).multiplyScalar(k).add(center);
      p.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

// Dáng thân áo khoác (xoay quanh trục y)
const JACKET_PROFILE = [
  [0, -0.44],
  [0.4, -0.44],
  [0.45, -0.38],
  [0.47, -0.1],
  [0.48, 0.14],
  [0.44, 0.3],
  [0.3, 0.41],
  [0, 0.42],
].map(([x, y]) => new Vector2(x, y));

function useMaterials() {
  return useMemo(() => {
    const circuit = circuitTexture();
    return {
      helmet: new MeshPhysicalMaterial({
        color: RED,
        roughness: 0.18,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        emissive: NEON,
        emissiveMap: circuit,
        emissiveIntensity: 2.6,
        side: DoubleSide,
      }),
      gloss: new MeshPhysicalMaterial({ color: RED, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 }),
      white: new MeshPhysicalMaterial({ color: WHITE, roughness: 0.3, clearcoat: 0.6 }),
      frame: new MeshPhysicalMaterial({ color: WHITE, roughness: 0.3, clearcoat: 0.6, alphaMap: roundedRectMask(...FRAME), alphaTest: 0.5 }),
      visor: new MeshPhysicalMaterial({
        color: '#030308',
        roughness: 0.05,
        metalness: 0.2,
        clearcoat: 1,
        envMapIntensity: 0.7,
        alphaMap: roundedRectMask(...VISOR),
        alphaTest: 0.5,
      }),
      eye: new MeshStandardMaterial({ color: EYE, emissive: EYE, emissiveIntensity: 3, toneMapped: false }),
      neon: new MeshStandardMaterial({ color: NEON, emissive: NEON, emissiveIntensity: 2.6, toneMapped: false }),
      vent: new MeshStandardMaterial({ color: '#1e7bff', emissive: '#ffffff', emissiveMap: ventTexture(), emissiveIntensity: 1.6, toneMapped: false }),
      ventFrame: new MeshStandardMaterial({ color: '#0b1433', roughness: 0.3, metalness: 0.4 }),
      fabricRed: new MeshStandardMaterial({ color: '#C8141C', roughness: 0.85 }),
      fabricWhite: new MeshStandardMaterial({ color: '#ECEBE6', roughness: 0.8 }),
      shirt: new MeshStandardMaterial({ color: '#FAFAFA', roughness: 0.9 }),
      pants: new MeshStandardMaterial({ color: '#131318', roughness: 0.85 }),
      metal: new MeshStandardMaterial({ color: '#d9dde3', roughness: 0.2, metalness: 1 }),
      zipper: new MeshStandardMaterial({ color: '#8a8d94', roughness: 0.4, metalness: 0.8 }),
      shoe: new MeshStandardMaterial({ color: '#F7F7F7', roughness: 0.5 }),
      sole: new MeshStandardMaterial({ color: '#D5121B', roughness: 0.55 }),
      dudiPatch: new MeshStandardMaterial({ map: dudiPatchTexture(), roughness: 0.7 }),
      duPatch: new MeshStandardMaterial({ map: duPatchTexture(), roughness: 0.6, transparent: true }),
    };
  }, []);
}

function Head({ m, eyeL, eyeR }) {
  const geo = useMemo(
    () => ({
      frame: conformedPanel(FRAME[0], FRAME[1], 0.015),
      visor: conformedPanel(VISOR[0], VISOR[1], 0.035),
    }),
    []
  );
  const eyeZ = (x, y) => helmetZ(x, y) + 0.05;

  // Đèn trên đỉnh: đặt trên bề mặt mũ, nghiêng theo pháp tuyến
  const vent = useMemo(() => {
    const { cy, b, c } = HELMET;
    const z = 0.42;
    const y = cy + b * Math.sqrt(1 - (z / c) ** 2);
    const n = new Vector3(0, (y - cy) / b ** 2, z / c ** 2).normalize();
    return { pos: [0, y + n.y * 0.01, z + n.z * 0.01], rotX: Math.atan2(n.z, n.y) };
  }, []);

  return (
    <group>
      {/* Vỏ mũ đỏ, hở phía dưới để lộ phần cằm trắng */}
      <mesh position={[0, HELMET.cy, 0]} scale={[HELMET.a, HELMET.b, HELMET.c]} material={m.helmet}>
        <sphereGeometry args={[1, 96, 64, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
      </mesh>
      <mesh position={[0, 0.76, 0]} scale={[0.9, 0.74, 0.82]} material={m.white}>
        <sphereGeometry args={[1, 64, 48]} />
      </mesh>

      {/* Khung mặt trắng + kính đen */}
      <mesh geometry={geo.frame} material={m.frame} />
      <mesh geometry={geo.visor} material={m.visor} />

      {/* Mắt: 2 mắt tròn + 2 chấm nhỏ */}
      <group ref={eyeL} position={[-0.29, FACE_Y, eyeZ(-0.29, FACE_Y)]}>
        <mesh material={m.eye} scale={[1, 1, 0.3]}>
          <sphereGeometry args={[0.075, 24, 24]} />
        </mesh>
      </group>
      <group ref={eyeR} position={[0.29, FACE_Y, eyeZ(0.29, FACE_Y)]}>
        <mesh material={m.eye} scale={[1, 1, 0.3]}>
          <sphereGeometry args={[0.075, 24, 24]} />
        </mesh>
      </group>
      {[0.8, 0.7].map((y) => (
        <mesh key={y} material={m.eye} position={[-0.46, y, eyeZ(-0.46, y) - 0.01]} scale={[1, 1, 0.3]}>
          <sphereGeometry args={[0.024, 12, 12]} />
        </mesh>
      ))}

      {/* Tai tròn có vòng neon */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.74, 1.43, -0.06]} rotation={[0, s * 0.25, -s * 0.5]}>
          <mesh material={m.gloss} scale={[1, 1, 0.62]}>
            <sphereGeometry args={[0.27, 40, 32]} />
          </mesh>
          <mesh material={m.neon} position={[0, 0, 0.15]}>
            <torusGeometry args={[0.15, 0.02, 12, 48]} />
          </mesh>
        </group>
      ))}

      {/* Đèn trên đỉnh */}
      <group position={vent.pos} rotation={[vent.rotX, 0, 0]}>
        <RoundedBox args={[0.5, 0.06, 0.3]} radius={0.025} material={m.ventFrame} />
        <mesh position={[0, 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]} material={m.vent}>
          <planeGeometry args={[0.42, 0.22]} />
        </mesh>
      </group>
    </group>
  );
}

function Arm({ side, m, armRef }) {
  return (
    <group ref={armRef} position={[side * 0.46, 0.28, 0]} rotation={[0, 0, side * 0.18]}>
      <mesh position={[0, -0.25, 0]} material={m.fabricRed}>
        <capsuleGeometry args={[0.155, 0.34, 8, 20]} />
      </mesh>
      {/* Bo tay sọc đỏ trắng */}
      <mesh position={[0, -0.47, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.fabricWhite}>
        <torusGeometry args={[0.13, 0.05, 12, 32]} />
      </mesh>
      <mesh position={[0, -0.52, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.fabricRed}>
        <torusGeometry args={[0.13, 0.045, 12, 32]} />
      </mesh>
      {/* Găng tay đỏ bóng */}
      <mesh position={[0, -0.66, 0.01]} scale={[1, 1.1, 0.85]} material={m.gloss}>
        <sphereGeometry args={[0.14, 32, 24]} />
      </mesh>
      <mesh position={[-side * 0.09, -0.62, 0.07]} material={m.gloss}>
        <sphereGeometry args={[0.055, 16, 16]} />
      </mesh>
    </group>
  );
}

function Body({ m, armL, armR, tail }) {
  const geo = useMemo(() => {
    const curve = new CatmullRomCurve3([
      new Vector3(0, 0, 0),
      new Vector3(-0.18, -0.14, -0.26),
      new Vector3(-0.55, -0.24, -0.32),
      new Vector3(-0.88, -0.14, -0.2),
      new Vector3(-1.03, 0.04, -0.04),
    ]);
    const ringAt = curve.getPointAt(0.72);
    const ringDir = curve.getTangentAt(0.72);
    const zAxis = new Vector3(0, 0, 1);
    return {
      jacket: new LatheGeometry(JACKET_PROFILE, 48),
      tail: tailGeometry(curve),
      ring: ringAt,
      ringQuat: new Quaternion().setFromUnitVectors(zAxis, ringDir),
    };
  }, []);

  // Vị trí trên mặt trước áo: áo là khối xoay, bị ép theo trục z
  const JZ = 0.72;
  const patchZ = JZ * Math.sqrt(0.48 ** 2 - 0.24 ** 2) + 0.012;

  return (
    <group>
      {/* Thân áo khoác trắng */}
      <mesh geometry={geo.jacket} scale={[1, 1, JZ]} material={m.fabricWhite} />

      {/* Cổ áo và gấu áo sọc */}
      <mesh position={[0, 0.39, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.8, 1]} material={m.fabricRed}>
        <torusGeometry args={[0.22, 0.055, 12, 40]} />
      </mesh>
      {[
        [-0.36, m.fabricRed],
        [-0.4, m.fabricWhite],
        [-0.44, m.fabricRed],
      ].map(([y, mat]) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, JZ, 1]} material={mat}>
          <torusGeometry args={[0.45, 0.03, 10, 64]} />
        </mesh>
      ))}

      {/* Áo phông, khoá kéo, nẹp đỏ ở chỗ áo mở */}
      <mesh position={[0, -0.02, JZ * 0.47 + 0.003]} material={m.shirt}>
        <boxGeometry args={[0.15, 0.76, 0.01]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.085, -0.02, JZ * 0.47 + 0.01]} material={m.zipper}>
            <boxGeometry args={[0.014, 0.76, 0.012]} />
          </mesh>
          <mesh position={[s * 0.11, -0.02, JZ * 0.47 + 0.004]} material={m.fabricRed}>
            <boxGeometry args={[0.035, 0.76, 0.012]} />
          </mesh>
        </group>
      ))}

      {/* Miếng dán ngực */}
      <mesh position={[-0.24, 0.12, patchZ]} rotation={[0, -0.39, 0]} material={m.dudiPatch}>
        <planeGeometry args={[0.24, 0.15]} />
      </mesh>
      <mesh position={[0.24, 0.12, patchZ]} rotation={[0, 0.39, 0]} material={m.duPatch}>
        <circleGeometry args={[0.075, 40]} />
      </mesh>

      {/* Tay */}
      <Arm side={-1} m={m} armRef={armL} />
      <Arm side={1} m={m} armRef={armR} />

      {/* Thắt lưng + khoen bạc */}
      <mesh position={[0, -0.49, 0]} scale={[1, 1, JZ]} material={m.pants}>
        <cylinderGeometry args={[0.4, 0.4, 0.08, 40]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.045, -0.49, JZ * 0.4 + 0.01]} material={m.metal}>
          <torusGeometry args={[0.045, 0.012, 10, 28]} />
        </mesh>
      ))}

      {/* Quần jogger đen, sọc đỏ bên hông */}
      <mesh position={[0, -0.6, 0]} scale={[1, 1, 0.75]} material={m.pants}>
        <cylinderGeometry args={[0.39, 0.34, 0.2, 40]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.19, 0, 0]}>
          <mesh position={[0, -0.8, 0]} material={m.pants}>
            <capsuleGeometry args={[0.17, 0.3, 8, 20]} />
          </mesh>
          <mesh position={[0, -1.02, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.pants}>
            <torusGeometry args={[0.14, 0.04, 10, 28]} />
          </mesh>
          <mesh position={[s * 0.168, -0.76, 0]} material={m.fabricRed}>
            <boxGeometry args={[0.012, 0.42, 0.06]} />
          </mesh>

          {/* Giày sneaker trắng đế đỏ */}
          <RoundedBox args={[0.3, 0.19, 0.5]} radius={0.08} position={[0, -1.12, 0.07]} material={m.shoe} />
          <RoundedBox args={[0.33, 0.07, 0.54]} radius={0.03} position={[0, -1.215, 0.07]} material={m.sole} />
          <mesh position={[s * 0.152, -1.1, 0.07]} rotation={[0, 0, 0.5]} material={m.sole}>
            <boxGeometry args={[0.01, 0.05, 0.22]} />
          </mesh>
        </group>
      ))}

      {/* Đuôi đỏ bóng + khoen bạc */}
      <group ref={tail} position={[0, -0.4, -0.28]}>
        <mesh geometry={geo.tail} material={m.gloss} />
        <mesh position={geo.ring} quaternion={geo.ringQuat} material={m.metal}>
          <torusGeometry args={[0.1, 0.02, 12, 36]} />
        </mesh>
      </group>
    </group>
  );
}

// Hướng nhìn [yaw, pitch]. yaw > 0: quay sang phải màn hình, pitch > 0: cúi xuống.
const POSES = {
  shy: [-0.8, -0.22], // quay đi, ngước lên: không nhìn mật khẩu
  peek: [-0.42, -0.05], // quay đi một nửa, hé một mắt
};

// Tay phải (phía form): [xoay z, xoay x]. Giơ tay che khi nhập mật khẩu.
const RIGHT_ARM = {
  shy: [2.25, 0.55],
  peek: [1.35, 0.35],
};

// Độ mở mắt [trái màn hình, phải màn hình]
const EYES = {
  shy: [0.1, 0.1],
  peek: [0.1, 1],
};

function Dudi({ mood, shakeKey, pointer, reduced }) {
  const m = useMaterials();
  const head = useRef();
  const body = useRef();
  const eyeL = useRef();
  const eyeR = useRef();
  const armL = useRef();
  const armR = useRef();
  const tail = useRef();
  const shake = useRef({ pending: false, start: -10 });

  useEffect(() => {
    if (shakeKey) shake.current.pending = true;
  }, [shakeKey]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.1);
    const damp = (obj, key, target, speed = 6) => {
      obj[key] = MathUtils.damp(obj[key], target, speed, dt);
    };

    let yaw;
    let pitch;
    if (POSES[mood]) {
      [yaw, pitch] = POSES[mood];
    } else if (mood === 'watch') {
      // Nhìn về phía form: bên phải trên desktop, phía dưới trên mobile
      const formBelow = state.size.width < 520;
      yaw = formBelow ? 0 : 0.6;
      pitch = formBelow ? 0.4 : 0.12;
    } else {
      yaw = MathUtils.clamp(pointer.current.x, -1, 1) * 0.6;
      pitch = MathUtils.clamp(pointer.current.y, -1, 1) * 0.3;
    }

    // Lắc đầu khi đăng nhập sai
    if (shake.current.pending) {
      shake.current.pending = false;
      shake.current.start = t;
    }
    const since = t - shake.current.start;
    const shaking = since < 0.7;
    if (shaking) yaw += Math.sin(since * 30) * 0.3 * (1 - since / 0.7);

    damp(head.current.rotation, 'y', yaw, shaking ? 30 : 6);
    damp(head.current.rotation, 'x', pitch);
    damp(head.current.rotation, 'z', -yaw * 0.1, 4);
    damp(body.current.rotation, 'y', yaw * 0.25, 4);

    // Tay
    const sway = reduced ? 0 : Math.sin(t * 1.6) * 0.04;
    let [rz, rx] = RIGHT_ARM[mood] || [0.18 + sway, 0];
    if (mood === 'wave') {
      // Giơ tay chào, vẫy qua lại
      rz = 2.55 + (reduced ? 0 : Math.sin(t * 7) * 0.28);
      rx = 0.25;
    }
    damp(armR.current.rotation, 'z', rz, 7);
    damp(armR.current.rotation, 'x', rx, 7);
    damp(armL.current.rotation, 'z', -0.18 - sway, 4);

    // Vẫy đuôi, thở nhẹ
    if (!reduced) {
      tail.current.rotation.y = Math.sin(t * 2.2) * 0.14;
      body.current.scale.y = 1 + Math.sin(t * 1.8) * 0.006;
    }

    // Chớp mắt
    const blinking = !reduced && t % 4.2 < 0.13;
    const [openL, openR] = EYES[mood] || [1, 1];
    damp(eyeL.current.scale, 'y', blinking ? 0.12 : openL, 18);
    damp(eyeR.current.scale, 'y', blinking ? 0.12 : openR, 18);
  });

  return (
    <group position={[0, -0.45, 0]}>
      <group ref={body}>
        <Body m={m} armL={armL} armR={armR} tail={tail} />
      </group>
      <group ref={head} position={[0, 0.42, 0]}>
        <Head m={m} eyeL={eyeL} eyeR={eyeR} />
      </group>
    </group>
  );
}

// Trên màn rộng, dời nhân vật sang phải để chừa chỗ cho tagline góc trái
function Rig({ shift, children }) {
  const group = useRef();
  useFrame((state, delta) => {
    const target = shift === 'full' && state.size.width >= 700 ? 0.9 : 0;
    group.current.position.x = MathUtils.damp(group.current.position.x, target, 4, Math.min(delta, 0.1));
  });
  return <group ref={group}>{children}</group>;
}

// Khung hình: toàn thân (trang đăng nhập) hoặc nửa người (thẻ chào trang chủ)
const CAMERAS = {
  full: { position: [0, 0.15, 9.2], fov: 32 },
  bust: { position: [0, 0.62, 6.4], fov: 32 },
  hero: { position: [0, 1.2, 5.8], fov: 32 },
};

export default function Mascot({ mood = 'idle', shakeKey = 0, framing = 'full', showGround = true, showSparkles = true, className = 'mascot' }) {
  const wrap = useRef();
  const pointer = useRef({ x: 0, y: 0 });
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Theo dõi chuột trên toàn trang, tính tương đối với vị trí đầu nhân vật
  useEffect(() => {
    const onMove = (e) => {
      const r = wrap.current?.getBoundingClientRect();
      if (!r) return;
      pointer.current.x = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
      pointer.current.y = (e.clientY - (r.top + r.height * 0.35)) / (window.innerHeight / 2);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div ref={wrap} className={className} aria-hidden="true">
      <Canvas dpr={[1, 2]} camera={CAMERAS[framing]} gl={{ alpha: true, antialias: true }} fallback={null}>
        <ambientLight intensity={0.45} />
        <directionalLight position={[3, 4, 5]} intensity={1.8} />
        <pointLight position={[-3, 1.5, -2]} intensity={16} color={NEON} />
        <pointLight position={[0, -2.5, -2]} intensity={10} color={RED} />

        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2.4} position={[3, 3, 4]} scale={[4, 2, 1]} />
          <Lightformer form="rect" intensity={1.4} position={[-4, 2, 3]} scale={[3, 3, 1]} />
          <Lightformer form="rect" intensity={3} color={NEON} position={[-4, 1, -2]} scale={[2, 5, 1]} />
          <Lightformer form="rect" intensity={2} color={RED} position={[0, -3, -3]} scale={[8, 1, 1]} />
        </Environment>

        <Rig shift={framing}>
          <Dudi mood={mood} shakeKey={shakeKey} pointer={pointer} reduced={reduced} />

          {/* Vòng sáng dưới chân */}
          {showGround && (
            <>
              <mesh position={[0, -1.7, 0.07]} rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.95, 0.016, 16, 120]} />
                <meshStandardMaterial color={RED} emissive={RED} emissiveIntensity={2} toneMapped={false} />
              </mesh>
              <ContactShadows position={[0, -1.705, 0]} opacity={0.6} scale={5} blur={2.2} far={2} />
            </>
          )}
        </Rig>

        {showSparkles && <Sparkles count={50} scale={[9, 6, 4]} size={1.6} speed={reduced ? 0 : 0.25} opacity={0.5} color="#A9AED6" />}
      </Canvas>
    </div>
  );
}
