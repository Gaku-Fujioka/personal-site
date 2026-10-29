// Coordinates use CSS pixels: x/y are on the floor, z points up.
export const roomViews = {
  overview: { x: 450, y: 310, z: 165, pitch: 55, yaw: -32, scale: 1 },
  desk: { x: 265, y: 185, z: 253, pitch: 80, yaw: 0, scale: 2.2 },
  projects: { x: 675, y: 5, z: 235, pitch: 80, yaw: 0, scale: 2 },
  journal: { x: 677, y: 414, z: 120, pitch: 8, yaw: -8, scale: 3 },
};
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export function cameraTransform(view, width, height, zoom = 1, yaw = view.yaw, pitch = view.pitch) {
  // Leave room for the upper wall corners, the floor edge and the control hints.
  const fit = Math.min(width / 1240, height / (view === roomViews.overview ? 1120 : 800));
  const scale = fit * view.scale * clamp(zoom, .7, 1.6);
  return `translate3d(${width / 2}px,${height / 2 + 10}px,0) scale(${scale}) rotateX(${pitch}deg) rotateZ(${yaw}deg) translate3d(${-view.x}px,${-view.y}px,${-view.z}px)`;
}
