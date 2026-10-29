import test from 'node:test';
import assert from 'node:assert/strict';
import {labMatrices,tileVertices} from '../src/lib/canvas-lab-math.mjs';
const transform=(m,[x,y])=>[0,1,2,3].map(row=>m[row]*x+m[4+row]*y+m[12+row]);
test('GPU projection and native HTML hit geometry agree under perspective',()=>{
  for(const [width,height,cardWidth] of [[240,510,208],[308,510,276],[872,540,420]]) {
    for(const yaw of [-.2,-.12,0]) {
      const {clip,screen}=labMatrices(width,height,cardWidth,390,{pitch:.1,yaw,lift:7});
      for(const point of [[0,0],[cardWidth,0],[0,390],[cardWidth,390],[20,230],[cardWidth/2,195]]) {
        const gpu=transform(clip,point),html=transform(screen,point);
        const gpuX=(gpu[0]/gpu[3]+1)*width/2,gpuY=(1-gpu[1]/gpu[3])*height/2;
        assert.ok(Math.abs(html[0]/html[3]-gpuX)<1e-6);
        assert.ok(Math.abs(html[1]/html[3]-gpuY)<1e-6);
        assert.ok(gpuX>=0&&gpuX<=width&&gpuY>=0&&gpuY<=height);
      }
    }
  }
});
test('forty GPU tiles cover the source HTML once without duplicating its DOM',()=>{
  const width=420,height=390,vertices=tileVertices(width,height);
  assert.equal(vertices.length,40*6*5);
  let area=0;
  for(let offset=0;offset<vertices.length;offset+=15) {
    const [ax,ay]=vertices.slice(offset,offset+2),[bx,by]=vertices.slice(offset+5,offset+7),[cx,cy]=vertices.slice(offset+10,offset+12);
    area+=Math.abs((bx-ax)*(cy-ay)-(by-ay)*(cx-ax))/2;
  }
  assert.equal(area,width*height);
  assert.ok([...vertices].every(Number.isFinite));
});
