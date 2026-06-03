declare module "*.geojson" {
  const value: {
    type: string;
    name?: string;
    features: Array<{
      type: string;
      properties: Record<string, unknown>;
      geometry: {
        type: string;
        coordinates: number[][][] | number[][][][];
      };
    }>;
  };
  export default value;
}
