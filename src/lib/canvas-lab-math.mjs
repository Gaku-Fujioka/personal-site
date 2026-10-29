export const identity = () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
export function multiply(a,b) {
  const result = new Array(16).fill(0);
  for(let column=0;column<4;column++) for(let row=0;row<4;row++) for(let k=0;k<4;k++) result[column*4+row] += a[k*4+row]*b[column*4+k];
  return result;
}
export function translation(x,y,z=0) { const m=identity(); m[12]=x;m[13]=y;m[14]=z;return m; }
export function rotation(x,y) {
  const cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y);
  return multiply([1,0,0,0, 0,cx,sx,0, 0,-sx,cx,0, 0,0,0,1], [cy,0,-sy,0, 0,1,0,0, sy,0,cy,0, 0,0,0,1]);
}
export function labMatrices(width,height,cardWidth,cardHeight,{pitch=.08,yaw=-.12,lift=0}={}) {
  const fit=Math.min((width-48)/cardWidth,(height-100)/cardHeight,1.05);
  const s=identity();s[0]=s[5]=s[10]=fit;
  const model=multiply(multiply(multiply(translation(width/2,height/2+lift),rotation(pitch,yaw)),s),translation(-cardWidth/2,-cardHeight/2));
  const projection=[2/width,0,0,0, 0,-2/height,0,0, 0,0,-1/1500,-1/900, -1,1,0,1];
  const clip=multiply(projection,model);
  const viewport=[width/2,0,0,0, 0,-height/2,0,0, 0,0,1,0, width/2,height/2,0,1];
  return {clip,screen:multiply(viewport,clip)};
}
export function tileVertices(width,height,columns=8,rows=5) {
  const vertices=[];
  for(let row=0;row<rows;row++) for(let column=0;column<columns;column++) {
    const x=column*width/columns,y=row*height/rows,w=width/columns,h=height/rows;
    for(const [u,v] of [[0,0],[1,0],[0,1],[0,1],[1,0],[1,1]]) vertices.push(x+u*w,y+v*h,x+w/2,y+h/2,row*columns+column);
  }
  return new Float32Array(vertices);
}
