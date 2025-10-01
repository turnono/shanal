declare module "firebase/ai" {
  export function getGenerativeModel(...args: any[]): any;
}

declare module "firebase/vertexai" {
  export function getVertexAI(app: any): any;
  export function getGenerativeModel(...args: any[]): any;
}
