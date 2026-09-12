import React, { useEffect, useRef } from 'react';

export default function ShaderCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vs = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;
    const fs = `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uIntensity;

// Dynamic Julia Set Fractal
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Zoom and Pan
    uv *= 2.5 / uZoom;

    // Julia morphing constant
    vec2 c = vec2(
        -0.7 + sin(iTime * 0.3 * uSpeed) * 0.1,
        0.27015 + cos(iTime * 0.2 * uSpeed) * 0.05
    );

    vec2 z = uv;
    float iter = 0.0;
    const float maxIter = 100.0;

    for (float i = 0.0; i < maxIter; i++) {
        // z = z^2 + c
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        if (dot(z, z) > 4.0) {
            iter = i;
            break;
        }
    }

    // Void & Glow Theme
    vec3 col = vec3(0.02, 0.02, 0.02); // Deep dark void for the background
    if (iter < maxIter) {
        float normIter = iter / maxIter;
        
        // Oscillate between Purple (uColor1) and Cyan (uColor3)
        vec3 accent = mix(uColor1, uColor3, sin(normIter * 20.0 - iTime * 2.0) * 0.5 + 0.5);
        
        // Add a smooth, dark glow effect
        col = accent * pow(normIter, 0.7) * uIntensity * 1.5;
    }

    fragColor = vec4(col, 1.0);
}
void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }`;

    const vert = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vert, vs); gl.compileShader(vert);

    const frag = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(frag, fs); gl.compileShader(frag);

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vert); gl.attachShader(prog, frag);
    gl.linkProgram(prog); gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    // Set Void & Glow color uniforms
    gl.uniform1f(gl.getUniformLocation(prog, 'uSpeed'), 0.8);
    gl.uniform1f(gl.getUniformLocation(prog, 'uZoom'), 1.2);
    // Purple: rgb(147, 51, 234) -> 0.576, 0.200, 0.917
    gl.uniform3f(gl.getUniformLocation(prog, 'uColor1'), 0.576, 0.200, 0.917);
    gl.uniform3f(gl.getUniformLocation(prog, 'uColor2'), 0.925, 0.282, 0.600); // Unused, keeping for structure
    // Cyan: rgb(6, 182, 212) -> 0.023, 0.713, 0.831
    gl.uniform3f(gl.getUniformLocation(prog, 'uColor3'), 0.023, 0.713, 0.831);
    gl.uniform1f(gl.getUniformLocation(prog, 'uIntensity'), 1.2);

    let animId: number;
    const render = (t: number) => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(gl.getUniformLocation(prog, 'iResolution'), canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(prog, 'iTime'), t * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}
