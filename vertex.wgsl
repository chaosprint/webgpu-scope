@vertex
fn main(@location(0) VertexPosition : vec4<f32>) -> @builtin(position) vec4<f32> {
    return VertexPosition;
}