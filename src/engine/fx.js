// WebGL effects in the drawing's own camera: soft particles for fire, smoke, dust, steam,
// sparks, splashes, debris and splinters. Particles live in world space (the machine's
// units), are integrated on the CPU, sorted back to front, and split between a canvas
// under the machine's SVG (anything a part stands in front of) and one above it.
import * as k from "../../vendor/anatomy/kit/iso-kit.mjs";
import * as G from "../../vendor/anatomy/kit/lathe.mjs";

export const KIND = { smoke: 0, fire: 1, dust: 2, spark: 3, steam: 4, debris: 5, splash: 6, ember: 7, splinter: 8, liquid: 9, mist: 10, soot: 11, glow: 12 };

const VERT = `attribute vec2 aPos;attribute vec2 aUV;attribute vec4 aD;attribute float aA;
uniform vec2 uView;
varying vec2 vUV;varying vec4 vD;varying float vA;
void main(){vUV=aUV;vD=aD;vA=aA;gl_Position=vec4(aPos.x/uView.x*2.-1.,1.-aPos.y/uView.y*2.,0.,1.);}`;

const FRAG = `precision mediump float;
varying vec2 vUV;varying vec4 vD;varying float vA;
uniform float uLight;uniform float uTime;
float h12(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float n2(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h12(i),h12(i+vec2(1.,0.)),f.x),mix(h12(i+vec2(0.,1.)),h12(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){return .55*n2(p)+.3*n2(p*2.1+7.3)+.15*n2(p*4.3+3.1);}
vec3 heatInk(float h){
  vec3 c=vec3(.28,.08,.05);
  c=mix(c,vec3(.72,.14,.04),smoothstep(.05,.25,h));
  c=mix(c,vec3(.96,.42,.06),smoothstep(.22,.5,h));
  c=mix(c,vec3(1.,.72,.18),smoothstep(.45,.75,h));
  c=mix(c,vec3(1.,.95,.78),smoothstep(.75,1.,h));
  return c;}
vec3 heatGlow(float h){
  vec3 c=vec3(.5,.08,.02)*.6;
  c=mix(c,vec3(1.,.3,.05),smoothstep(.1,.4,h));
  c=mix(c,vec3(1.,.7,.25),smoothstep(.4,.75,h));
  c=mix(c,vec3(1.,.97,.85),smoothstep(.75,1.,h));
  return c;}
void main(){
  float kind=vD.x;float t=vD.y;float seed=vD.z;float heat=vD.w;
  vec2 uv=vUV;
  float r=length(uv);
  if(r>=1.)discard;
  float nz=fbm(uv*1.7+vec2(seed*17.3,seed*5.1)+vec2(0.,-t*1.6));
  vec4 o=vec4(0.);
  if(kind<.5||(kind>10.5&&kind<11.5)){
    float soot=step(10.5,kind);
    float m=smoothstep(1.,.2,r+(nz-.5)*.7);
    float shade=clamp(.5+.5*uv.y+.25*(nz-.5),0.,1.);
    vec3 lightInk=mix(mix(vec3(.66,.66,.65),vec3(.84,.84,.83),shade),mix(vec3(.2,.19,.18),vec3(.36,.34,.32),shade),soot);
    vec3 darkInk=mix(mix(vec3(.30,.30,.30),vec3(.46,.46,.45),shade),mix(vec3(.06,.06,.06),vec3(.13,.12,.12),shade),soot);
    float a=m*vA*(1.-exp(-1.6*(1.-t)));
    vec3 c=mix(darkInk,lightInk,uLight);
    float warm=heat*smoothstep(.5,0.,t);
    c=mix(c,mix(vec3(.55,.2,.06),vec3(.95,.55,.2),uLight),warm*.6);
    o=vec4(c*a,a);
  } else if(kind<1.5){
    float m=smoothstep(1.,.05,r+(nz-.5)*.9*(.5+t));
    float h=clamp(heat*(1.-.35*r)*(.85+.3*nz),0.,1.);
    float a=m*vA;
    vec3 ink=heatInk(h);
    vec4 lightO=vec4(ink*a*.92,a*.92);
    vec3 g=heatGlow(h)*m*vA*1.6;
    vec4 darkO=vec4(g,a*.18);
    o=mix(darkO,lightO,uLight);
  } else if(kind<2.5){
    float m=smoothstep(1.,.15,r+(nz-.5)*.75);
    float shade=clamp(.5+.5*uv.y+.3*(nz-.5),0.,1.);
    vec3 c=mix(mix(vec3(.28,.25,.21),vec3(.42,.38,.33),shade),mix(vec3(.63,.57,.49),vec3(.80,.75,.68),shade),uLight);
    float a=m*vA*(1.-exp(-1.8*(1.-t)));
    o=vec4(c*a,a);
  } else if(kind<3.5){
    float along=uv.x*.5+.5;
    float w=1.-smoothstep(.15,1.,abs(uv.y));
    float m=w*smoothstep(0.,.35,along)*(1.-smoothstep(.92,1.,along));
    float h=heat*(.45+.55*along);
    vec3 ink=heatInk(clamp(h,0.,.85));
    float a=m*vA;
    o=mix(vec4(heatGlow(h)*a*1.5,a*.2),vec4(ink*a,a*.95),uLight);
  } else if(kind<4.5){
    float m=smoothstep(1.,.1,r+(nz-.5)*.8);
    float shade=clamp(.5+.5*uv.y+.3*(nz-.5),0.,1.);
    vec3 c=mix(mix(vec3(.55,.57,.6),vec3(.82,.84,.86),shade),mix(vec3(.70,.74,.79),vec3(.93,.94,.96),shade),uLight);
    float a=m*vA*(1.-exp(-2.2*(1.-t)))*.8;
    o=vec4(c*a,a);
  } else if(kind<5.5||(kind>7.5&&kind<8.5)){
    float ang=atan(uv.y,uv.x);
    float edge=.72+.22*sin(ang*3.+seed*20.)+.12*sin(ang*5.+seed*9.);
    float m=1.-smoothstep(edge-.12,edge,r);
    float lit=clamp(.5-.45*uv.y+.2*uv.x,0.,1.);
    vec3 stone=mix(mix(vec3(.30,.29,.28),vec3(.55,.54,.52),lit),mix(vec3(.38,.37,.35),vec3(.68,.67,.64),lit),uLight);
    vec3 wood=mix(mix(vec3(.34,.25,.15),vec3(.6,.47,.3),lit),mix(vec3(.45,.33,.2),vec3(.78,.64,.44),lit),uLight);
    vec3 c=kind>7.5?wood:stone;
    c=mix(c,heatInk(.6),heat*.8);
    float a=m*vA;
    o=vec4(c*a,a);
  } else if(kind<6.5||(kind>9.5&&kind<10.5)){
    float mist=step(9.5,kind);
    float m=mix(smoothstep(1.,.55,r),smoothstep(1.,.1,r+(nz-.5)*.8),mist);
    float lit=clamp(.6-.5*uv.y,0.,1.);
    vec3 c=mix(mix(vec3(.55,.66,.74),vec3(.86,.93,.98),lit),mix(vec3(.62,.73,.82),vec3(.92,.96,.99),lit),uLight);
    float a=m*vA*mix(.85,.5,mist);
    o=vec4(c*a,a);
  } else if(kind<7.5){
    float m=smoothstep(1.,0.,r);
    float fl=.7+.3*sin(uTime*23.+seed*40.);
    float h=heat*fl;
    float a=m*vA;
    o=mix(vec4(heatGlow(h)*a*1.4,a*.15),vec4(heatInk(h*.9)*a,a*.9),uLight);
  } else if(kind<9.5){
    float m=smoothstep(1.,.2,r+(nz-.5)*.6);
    float h=clamp(heat*(1.-.4*r),0.,1.);
    float a=m*vA;
    vec3 core=mix(vec3(.22,.12,.06),heatInk(h),smoothstep(.1,.5,h));
    o=mix(vec4(heatGlow(h)*a*1.3+vec3(.05,.02,0.)*a,a*.35),vec4(core*a,a*.95),uLight);
  } else {
    float m=smoothstep(1.,0.,r);
    float a=m*m*vA;
    o=mix(vec4(heatGlow(heat)*a,0.),vec4(heatInk(heat)*a*.5,a*.5),uLight);
  }
  float dn=(h12(gl_FragCoord.xy+fract(uTime*.61)*91.)-.5)/255.;
  o=max(o+dn*smoothstep(0.,1.5/255.,o.a),0.);
  o.rgb=min(o.rgb,vec3(o.a+step(.5,1.-uLight)));
  gl_FragColor=o;
}`;

function makeGl(canvas) {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: false });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT);
  const fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  const ibuf = gl.createBuffer();
  const idx = new Uint16Array(6 * 16000);
  for (let i = 0; i < 16000; i++) idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  const loc = (n) => gl.getAttribLocation(prog, n);
  const stride = 9 * 4;
  const aPos = loc("aPos"), aUV = loc("aUV"), aD = loc("aD"), aA = loc("aA");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(aUV);
  gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, stride, 8);
  gl.enableVertexAttribArray(aD);
  gl.vertexAttribPointer(aD, 4, gl.FLOAT, false, stride, 16);
  gl.enableVertexAttribArray(aA);
  gl.vertexAttribPointer(aA, 1, gl.FLOAT, false, stride, 32);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const u = { view: gl.getUniformLocation(prog, "uView"), light: gl.getUniformLocation(prog, "uLight"), time: gl.getUniformLocation(prog, "uTime") };
  let painted = false;
  return {
    gl,
    draw(data, count, view, light, time) {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(1.5, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(box.width * ratio));
      const h = Math.max(1, Math.round(box.height * ratio));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (!count) {
        painted = false;
        return;
      }
      gl.uniform2f(u.view, view[0], view[1]);
      gl.uniform1f(u.light, light);
      gl.uniform1f(u.time, time);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, count * 36), gl.DYNAMIC_DRAW);
      gl.drawElements(gl.TRIANGLES, count * 6, gl.UNSIGNED_SHORT, 0);
      painted = true;
    },
    clear() {
      if (!painted) return;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      painted = false;
    },
  };
}

// opts: back, front canvases; view [W, H]; P projection; unit metres per world unit.
export function createFx({ back, front, view, P, unit = 0.01, ground = 0 }) {
  const MAX = 9000;
  const A = {
    x: new Float32Array(MAX), y: new Float32Array(MAX), z: new Float32Array(MAX),
    vx: new Float32Array(MAX), vy: new Float32Array(MAX), vz: new Float32Array(MAX),
    age: new Float32Array(MAX), life: new Float32Array(MAX), s0: new Float32Array(MAX), s1: new Float32Array(MAX),
    kind: new Float32Array(MAX), seed: new Float32Array(MAX), heat: new Float32Array(MAX), cool: new Float32Array(MAX),
    drag: new Float32Array(MAX), buoy: new Float32Array(MAX), grav: new Float32Array(MAX), alpha: new Float32Array(MAX), bounce: new Float32Array(MAX),
  };
  let count = 0;
  const glBack = back ? makeGl(back) : null;
  const glFront = front ? makeGl(front) : null;
  const dataBack = new Float32Array(MAX * 36);
  const dataFront = new Float32Array(MAX * 36);
  const order = new Uint32Array(MAX);
  const depth = new Float32Array(MAX);
  let V = G.viewOf(P);
  let KS = G.scaleOf(P);
  let proj = P;
  let zoom = { s: 1, tx: 0, ty: 0 };
  let occluders = [];
  let floorZ = ground;
  const gWorld = 9.81 / unit;

  function spawn(kind, p, o = {}) {
    if (count >= MAX) return -1;
    const i = count++;
    const sp = o.spread ?? 0;
    const rnd = () => Math.random() * 2 - 1;
    const v = o.v || [0, 0, 0];
    A.x[i] = p[0] + rnd() * (o.jitter ?? 0);
    A.y[i] = p[1] + rnd() * (o.jitter ?? 0);
    A.z[i] = p[2] + rnd() * (o.jitter ?? 0) * 0.5;
    A.vx[i] = v[0] + rnd() * sp;
    A.vy[i] = v[1] + rnd() * sp;
    A.vz[i] = v[2] + rnd() * sp * (o.spreadZ ?? 1);
    A.age[i] = 0;
    A.life[i] = (o.life ?? 1) * (0.75 + Math.random() * 0.5);
    A.s0[i] = o.size ?? 4;
    A.s1[i] = o.grow ?? A.s0[i];
    A.kind[i] = KIND[kind] ?? kind;
    A.seed[i] = Math.random();
    A.heat[i] = o.heat ?? 0;
    A.cool[i] = o.cool ?? 1;
    A.drag[i] = o.drag ?? 1;
    A.buoy[i] = o.buoy ?? 0;
    A.grav[i] = o.grav ?? 0;
    A.alpha[i] = o.alpha ?? 1;
    A.bounce[i] = o.bounce ?? 0;
    return i;
  }

  function kill(i) {
    const j = --count;
    if (i === j) return;
    for (const key in A) A[key][i] = A[key][j];
  }

  function update(dt) {
    for (let i = 0; i < count; i++) {
      A.age[i] += dt;
      if (A.age[i] >= A.life[i]) {
        kill(i);
        i--;
        continue;
      }
      const d = Math.exp(-A.drag[i] * dt);
      A.vx[i] *= d;
      A.vy[i] *= d;
      A.vz[i] = A.vz[i] * d + (A.buoy[i] - A.grav[i] * gWorld) * dt;
      A.x[i] += A.vx[i] * dt;
      A.y[i] += A.vy[i] * dt;
      A.z[i] += A.vz[i] * dt;
      if (A.grav[i] > 0 && A.z[i] < floorZ) {
        if (A.bounce[i] > 0 && A.vz[i] < -2) {
          A.z[i] = floorZ;
          A.vz[i] = -A.vz[i] * A.bounce[i];
          A.vx[i] *= 0.6;
          A.vy[i] *= 0.6;
        } else {
          A.z[i] = floorZ;
          A.vz[i] = 0;
          A.vx[i] *= 0.8;
          A.vy[i] *= 0.8;
          if (A.kind[i] === KIND.splash || A.kind[i] === KIND.liquid) A.age[i] = Math.max(A.age[i], A.life[i] * 0.92);
        }
      }
      A.heat[i] = Math.max(0, A.heat[i] - dt * A.cool[i] * 0.9);
    }
  }

  const rayHits = (px, py, pz) => {
    for (const b of occluders) {
      let t0 = 0, t1 = 1e6;
      const o = [px, py, pz];
      for (let c = 0; c < 3; c++) {
        if (Math.abs(V[c]) < 1e-9) {
          if (o[c] < b.min[c] || o[c] > b.max[c]) {
            t0 = 1;
            t1 = 0;
            break;
          }
          continue;
        }
        let a = (b.min[c] - o[c]) / V[c];
        let bb = (b.max[c] - o[c]) / V[c];
        if (a > bb) [a, bb] = [bb, a];
        t0 = Math.max(t0, a);
        t1 = Math.min(t1, bb);
        if (t0 > t1) break;
      }
      if (t0 <= t1 && t1 > 0.5) return true;
    }
    return false;
  };

  function build(light) {
    for (let i = 0; i < count; i++) {
      order[i] = i;
      depth[i] = A.x[i] * V[0] + A.y[i] * V[1] + A.z[i] * V[2];
    }
    const idx = Array.from(order.subarray(0, count)).sort((a, b) => depth[a] - depth[b]);
    let nb = 0, nf = 0;
    const s = zoom.s;
    for (const i of idx) {
      const t = A.age[i] / A.life[i];
      const kind = A.kind[i];
      const size = A.s0[i] + (A.s1[i] - A.s0[i]) * Math.sqrt(t);
      const [cx0, cy0] = k.iso([A.x[i], A.y[i], A.z[i]], proj);
      const cx = cx0 * s + zoom.tx;
      const cy = cy0 * s + zoom.ty;
      const half = size * KS * s * 0.5;
      let fade = A.alpha[i] * Math.min(1, t * 12) * (1 - smooth01((t - 0.55) / 0.45));
      if (kind === KIND.debris || kind === KIND.splinter) fade = A.alpha[i] * (1 - smooth01((t - 0.85) / 0.15));
      if (kind === KIND.fire || kind === KIND.liquid) fade = A.alpha[i] * Math.min(1, t * 8) * (1 - smooth01((t - 0.35) / 0.65));
      const back = occluders.length && rayHits(A.x[i], A.y[i], A.z[i]);
      const data = back ? dataBack : dataFront;
      const n = back ? nb++ : nf++;
      const o = n * 36;
      let ax, ay, bx, by;
      if (kind === KIND.spark) {
        const p2 = k.iso([A.x[i] - A.vx[i] * 0.045, A.y[i] - A.vy[i] * 0.045, A.z[i] - A.vz[i] * 0.045], proj);
        let dx = cx - (p2[0] * s + zoom.tx), dy = cy - (p2[1] * s + zoom.ty);
        const l = Math.hypot(dx, dy);
        const w = Math.max(half, 0.6);
        if (l < 1e-3) {
          dx = w;
          dy = 0;
        }
        const ux = l < 1e-3 ? 1 : dx / l, uy = l < 1e-3 ? 0 : dy / l;
        const len2 = Math.max(l, w * 2) * 0.5;
        const mx = cx - ux * len2, my = cy - uy * len2;
        ax = ux * len2;
        ay = uy * len2;
        bx = -uy * w;
        by = ux * w;
        put(data, o, mx, my, ax, ay, bx, by, kind, t, A.seed[i], A.heat[i], fade);
      } else {
        put(data, o, cx, cy, half, 0, 0, half, kind, t, A.seed[i], A.heat[i], fade);
      }
    }
    return { nb, nf };
  }

  function put(data, o, cx, cy, ax, ay, bx, by, kind, t, seed, heat, alpha) {
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let c = 0; c < 4; c++) {
      const [u, v] = corners[c];
      const j = o + c * 9;
      data[j] = cx + ax * u + bx * v;
      data[j + 1] = cy + ay * u + by * v;
      data[j + 2] = u;
      data[j + 3] = v;
      data[j + 4] = kind;
      data[j + 5] = t;
      data[j + 6] = seed;
      data[j + 7] = heat;
      data[j + 8] = alpha;
    }
  }

  return {
    get count() {
      return count;
    },
    spawn,
    emit(kind, p, o = {}) {
      const n = o.n ?? 1;
      for (let i = 0; i < n; i++) spawn(kind, p, o);
    },
    update,
    render(light, time) {
      const { nb, nf } = build(light);
      if (glBack) glBack.draw(dataBack, nb, view, light, time);
      if (glFront) glFront.draw(dataFront, nf, view, light, time);
    },
    setOccluders(list) {
      occluders = list;
    },
    setZoom(z) {
      zoom = z;
    },
    setProjection(next) {
      proj = next;
      V = G.viewOf(next);
      KS = G.scaleOf(next);
    },
    setGround(z) {
      floorZ = z;
    },
    clear() {
      count = 0;
    },
    active: !!(glBack || glFront),
    unit,
    gWorld,
  };
}
const smooth01 = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
