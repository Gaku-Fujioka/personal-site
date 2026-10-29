import test from 'node:test';
import assert from 'node:assert/strict';
import { roomViews, cameraTransform } from '../src/lib/room-camera.mjs';

// Apply the emitted CSS camera transform and the scene's 1900px perspective.
// This checks actual room/exhibit bounds rather than only comparing transform strings.
function project(transform, point, width, height) {
  const parts = [...transform.matchAll(/(translate3d|scale|rotateX|rotateZ)\(([^)]+)\)/g)].reverse();
  let [x,y,z] = point;
  for (const [,name,values] of parts) {
    const numbers = values.split(',').map(Number.parseFloat);
    if (name === 'translate3d') { x += numbers[0]; y += numbers[1]; z += numbers[2]; }
    if (name === 'scale') { x *= numbers[0]; y *= numbers[0]; z *= numbers[0]; }
    const angle = numbers[0] * Math.PI / 180;
    if (name === 'rotateX') [y,z] = [y*Math.cos(angle)-z*Math.sin(angle), y*Math.sin(angle)+z*Math.cos(angle)];
    if (name === 'rotateZ') [x,y] = [x*Math.cos(angle)-y*Math.sin(angle), x*Math.sin(angle)+y*Math.cos(angle)];
  }
  const perspective = 1900 / (1900-z);
  return [(x-width/2)*perspective+width/2,(y-height/2)*perspective+height/2];
}
const viewportSizes = [[286,400],[341,450],[702,470],[1214,650],[1318,710]];
test('room overview contains the floor and both walls at phone, tablet and desktop sizes', () => {
  const corners = [[0,0,0],[900,0,0],[0,650,0],[900,650,0],[0,0,410],[900,0,410],[0,650,410]];
  for (const [width,height] of viewportSizes) {
    const transform = cameraTransform(roomViews.overview,width,height);
    for (const corner of corners) {
      const [x,y] = project(transform,corner,width,height);
      assert.ok(x >= 8 && x <= width-8, `${width}px: room x=${x}`);
      assert.ok(y >= 28 && y <= height-20, `${width}px: room y=${y}`);
    }
  }
});
test('focused views contain their real interactive surfaces', () => {
  const exhibits = {
    desk: [[100,185,355],[430,185,355],[100,185,125],[430,185,125]],
    projects: [[475,5,363],[873,5,363],[475,5,108],[873,5,108]],
    journal: [[577,329,120],[777,329,120],[577,500,120],[777,500,120]],
  };
  for (const [width,height] of viewportSizes) for (const [name,corners] of Object.entries(exhibits)) {
    const transform = cameraTransform(roomViews[name],width,height);
    for (const corner of corners) {
      const [x,y] = project(transform,corner,width,height);
      assert.ok(x >= 8 && x <= width-8, `${name}, ${width}px: x=${x}`);
      assert.ok(y >= 28 && y <= height-20, `${name}, ${width}px: y=${y}`);
    }
  }
});
