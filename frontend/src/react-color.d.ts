// src/react-color.d.ts
declare module 'react-color' {
    export interface ColorResult {
      hex: string;
      rgb: { r: number; g: number; b: number; a: number };
      hsl: { h: number; s: number; l: number; a: number };
      hsv: { h: number; s: number; v: number; a: number };
      source: string;
    }
  
    export class ChromePicker extends React.Component<{
      color: string | ColorResult;
      onChangeComplete?: (color: ColorResult) => void;
    }> {}
  }
  