declare module 'csstype' {
  interface Properties {
    '--background'?: string;
    [index: string]: any;
  }
  interface Window {
    routes: any;
    routeMaker: any;
    store: any;
    searchKey: string;
  }
}

declare module '*.md';
