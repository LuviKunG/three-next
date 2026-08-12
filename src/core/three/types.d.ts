import { ThreeInstance } from '@/lib/three-next';

interface TestInstance extends ThreeInstance {
  setCameraPosition: (x: number, y: number, z: number) => void;
}

export type { TestInstance };
