import * as THREE from 'three';
import TWEEN from 'three/addons/libs/tween.module.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

import { LAYOUTS } from '../layouts.js';
import { createTile } from './tile.js';

const CLICK_TOLERANCE_PX = 5;

/**
 * The CSS3D "periodic table" scene, adapted from the three.js
 * css3d_periodictable example to render people instead of elements.
 */
export class PeopleScene {
  #camera;
  #scene = new THREE.Scene();
  #renderer = new CSS3DRenderer();
  #controls;
  #objects = [];
  #targets = {};
  #frame = 0;

  constructor(container) {
    this.container = container;

    this.#camera = new THREE.PerspectiveCamera(40, aspectOf(container), 1, 12000);
    this.#camera.position.set(0, 0, 3000);

    this.#renderer.setSize(container.clientWidth, container.clientHeight);
    container.append(this.#renderer.domElement);

    this.#controls = new TrackballControls(this.#camera, this.#renderer.domElement);
    this.#controls.minDistance = 500;
    this.#controls.maxDistance = 8000;
    this.#controls.rotateSpeed = 1.5;
    this.#controls.addEventListener('change', this.render);

    this.#resizeObserver.observe(container);
    this.#animate();
  }

  /**
   * Creates one tile per person and precomputes every layout's targets.
   * @param {import('../data/people.js').Person[]} people
   * @param {(person) => void} [onSelect] called when a tile is clicked (not dragged)
   */
  setPeople(people, onSelect) {
    this.#clearObjects();

    for (const person of people) {
      const element = createTile(person);
      if (onSelect) bindClick(element, () => onSelect(person));

      const object = new CSS3DObject(element);
      object.position.set(Math.random() * 4000 - 2000, Math.random() * 4000 - 2000, Math.random() * 4000 - 2000);
      this.#scene.add(object);
      this.#objects.push(object);
    }

    for (const [name, layout] of Object.entries(LAYOUTS)) {
      this.#targets[name] = layout.build(people.length).map(toObject3D);
    }
  }

  /** Animates every tile (and the camera) to the named layout. */
  transform(layoutName, duration = 2000) {
    const targets = this.#targets[layoutName];
    if (!targets) throw new Error(`Unknown layout: ${layoutName}`);

    TWEEN.removeAll();

    this.#objects.forEach((object, i) => {
      const target = targets[i];
      const delay = Math.random() * duration;

      new TWEEN.Tween(object.position)
        .to({ x: target.position.x, y: target.position.y, z: target.position.z }, delay + duration)
        .easing(TWEEN.Easing.Exponential.InOut)
        .start();

      new TWEEN.Tween(object.rotation)
        .to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, delay + duration)
        .easing(TWEEN.Easing.Exponential.InOut)
        .start();
    });

    this.#moveCamera(LAYOUTS[layoutName].camera, duration);

    new TWEEN.Tween(this).to({}, duration * 2).onUpdate(this.render).start();
  }

  render = () => {
    this.#renderer.render(this.#scene, this.#camera);
  };

  dispose() {
    cancelAnimationFrame(this.#frame);
    TWEEN.removeAll();
    this.#resizeObserver.disconnect();
    this.#controls.dispose();
    this.#clearObjects();
    this.#renderer.domElement.remove();
  }

  #moveCamera(position, duration) {
    const camera = this.#camera;
    const controls = this.#controls;

    new TWEEN.Tween(camera.position)
      .to(position, duration)
      .easing(TWEEN.Easing.Exponential.InOut)
      .start();
    // Trackball rotation can tilt the camera; ease it back upright and re-centre.
    new TWEEN.Tween(camera.up).to({ x: 0, y: 1, z: 0 }, duration).easing(TWEEN.Easing.Exponential.InOut).start();
    new TWEEN.Tween(controls.target).to({ x: 0, y: 0, z: 0 }, duration).easing(TWEEN.Easing.Exponential.InOut).start();
  }

  #animate = () => {
    this.#frame = requestAnimationFrame(this.#animate);
    TWEEN.update();
    this.#controls.update();
  };

  #resizeObserver = new ResizeObserver(() => {
    this.#camera.aspect = aspectOf(this.container);
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.#controls.handleResize();
    this.render();
  });

  #clearObjects() {
    for (const object of this.#objects) {
      this.#scene.remove(object);
      object.element.remove();
    }
    this.#objects = [];
    this.#targets = {};
  }
}

/** Converts a plain layout target into an Object3D carrying position + rotation. */
function toObject3D({ position, lookAt }) {
  const object = new THREE.Object3D();
  object.position.set(position.x, position.y, position.z);
  if (lookAt) object.lookAt(lookAt.x, lookAt.y, lookAt.z);
  return object;
}

/** Fires `handler` on a click that was not part of an orbit drag. */
function bindClick(element, handler) {
  let start = null;
  element.addEventListener('pointerdown', (e) => (start = { x: e.clientX, y: e.clientY }));
  element.addEventListener('pointerup', (e) => {
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) < CLICK_TOLERANCE_PX) handler();
    start = null;
  });
}

function aspectOf(container) {
  return container.clientWidth / Math.max(1, container.clientHeight);
}
