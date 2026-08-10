// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { VRM, VRMLoaderPlugin, VRMHumanBoneName, VRMExpressionPresetName } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three-stdlib';

function NinaModel() {
  const [vrm, setVrm] = useState<VRM | null>(null);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      '/nina/Pink_Haired_Girl_Teen.vrm',
      (gltf) => {
        const vrmData = gltf.userData.vrm;
        if (vrmData) {
          vrmData.scene.rotation.y = Math.PI;
          
          // Relax arms from T-pose (downwards) using Normalized Bones
          const leftArm = vrmData.humanoid.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm);
          const rightArm = vrmData.humanoid.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm);
          if (leftArm) {
             leftArm.rotation.z = 1.3; // Bring arm down
             leftArm.rotation.y = -0.4; // Push slightly backward
             leftArm.rotation.x = -0.3;
          }
          if (rightArm) {
             rightArm.rotation.z = -1.3; // Bring arm down
             rightArm.rotation.y = 0.4; // Push slightly backward
             rightArm.rotation.x = -0.3;
          }

          setVrm(vrmData);
        }
      },
      (progress) => console.log('Loading VRM...', (progress.loaded / progress.total) * 100, '%'),
      (error) => console.error(error)
    );
  }, []);

  useFrame((state, delta) => {
    if (vrm) {
      vrm.update(delta);
      // Gentle floating/breathing animation
      vrm.scene.rotation.y = Math.PI + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      vrm.scene.position.y = -1.2 + Math.sin(state.clock.elapsedTime) * 0.02;

      // Blinking logic
      const blinkPhase = (state.clock.elapsedTime % 4); // Blink every 4 seconds
      if (blinkPhase > 3.8) {
          vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, 1.0);
      } else {
          vrm.expressionManager?.setValue(VRMExpressionPresetName.Blink, 0.0);
      }
      
      // Lip sync logic
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
         const t = state.clock.elapsedTime;
         // Smooth open and close based on time instead of random jitter every frame (approx 2 syllables per second)
         let mouthOpen = Math.abs(Math.sin(t * 12)) * (0.6 + Math.sin(t * 5) * 0.3);
         vrm.expressionManager?.setValue(VRMExpressionPresetName.Aa, mouthOpen);
      } else {
         vrm.expressionManager?.setValue(VRMExpressionPresetName.Aa, 0);
      }
      
      // Keep a soft smile
      vrm.expressionManager?.setValue(VRMExpressionPresetName.Happy, 0.2);
    }
  });

  if (!vrm) return null;
  return <primitive object={vrm.scene} />;
}

export default function NinaAvatar() {
  return (
    <div className="nina-avatar-container" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 50, backgroundImage: 'url(/nina_bg.png)', backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '12px' }}>
      <Canvas camera={{ position: [0, 0.2, 2], fov: 35 }} style={{ pointerEvents: 'auto' }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 2, 2]} intensity={1} />
        <Environment preset="city" />
        <NinaModel />
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.1} minPolarAngle={Math.PI / 2 - 0.2} />
      </Canvas>
    </div>
  );
}
