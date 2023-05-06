const length = 2048;

class Sinosc {
  constructor() {
    this.freq = 440;
    this.phase = 0;
    this.length = length;
    this.sinValues = new Float32Array(this.length);
    this.sr = 44100;
  }

  generateNewSinValues() {
    for (let i = 0; i < this.length; i++) {
      this.sinValues[i] = Math.sin(2 * Math.PI * this.phase);
      this.phase = this.phase + this.freq / this.sr;
    }
    return this.sinValues;
  }
}

function generateUniformFloat32Array() {
  const step = 2 / (length - 1);
  const uniformArray = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    uniformArray[i] = -1 + i * step;
  }

  return uniformArray;
}

const uniformArray = generateUniformFloat32Array();

const sinosc = new Sinosc();
sinosc.freq = 10;

var vertices = new Float32Array(length*2);
// const newSinValues = sinosc.generateNewSinValues();

(async () => {
  const canvas = document.getElementById("webgpuCanvas");
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const context = canvas.getContext("webgpu");
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'opaque',
  });

  const vertexShaderCode = await fetch('./vertex.wgsl').then(res => res.text());
  const fragmentShaderCode = await fetch('./frag.wgsl').then(res => res.text());

  // const vertices = new Float32Array([
  //   0.0, 0.5,
  //   -0.5, -0.5,
  //   0.5, -0.5, 
  // ])

  let newSinValues = sinosc.generateNewSinValues();

  for (let i = 0; i < length; i++) {
    vertices[i * 2] = uniformArray[i];
    vertices[i * 2 + 1] = newSinValues[i];
  }

  var vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  })
  device.queue.writeBuffer(vertexBuffer, 0, vertices);

  // console.log(newSinValues)
  
  newSinValues = sinosc.generateNewSinValues();

  // console.log(newSinValues)


  document.getElementById("slider").oninput= (e) => {
    let freq = e.target.value;
    document.getElementById("freq").innerHTML = `Freq: ${freq} Hz`;
    sinosc.freq = freq;
    // let shift = e.target.value / 100 - 0.5;
    // vertices[0] = shift;
    // vertices[2] = -0.5 + shift;
    // vertices[4] = 0.5 + shift;
    // device.queue.writeBuffer(vertexBuffer, 0, vertices);
  }

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        code: vertexShaderCode,
      }),
      entryPoint: 'main',
      buffers: [{
        arrayStride: 4 * 2,
        attributes: [{
          shaderLocation: 0,
          offset: 0,
          format: 'float32x2'
        }]
      }]
    },
    fragment: {
      module: device.createShaderModule({
        code: fragmentShaderCode,
      }),
      entryPoint: 'main',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'line-list',
    },
  });

  function frame() {
    if (!canvas) return;
    const textureView = context.getCurrentTexture().createView();
    const renderPassDescriptor = {
      colorAttachments: [
        {
           view: textureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    let newSinValues = sinosc.generateNewSinValues();
    
    for (let i = 0; i < length; i++) {
      vertices[i * 2] = uniformArray[i];
      vertices[i * 2 + 1] = newSinValues[i];
    }
    device.queue.writeBuffer(vertexBuffer, 0, vertices);
    const commandEncoder = device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.draw(length);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})()