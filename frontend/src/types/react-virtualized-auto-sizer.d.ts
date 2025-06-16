declare module 'react-virtualized-auto-sizer' {
  import * as React from 'react';

  export interface Size {
    width: number;
    height: number;
  }

  export interface AutoSizerProps {
    children: (size: Size) => React.ReactNode;
    className?: string;
    disableHeight?: boolean;
    disableWidth?: boolean;
    style?: React.CSSProperties;
    defaultWidth?: number;
    defaultHeight?: number;
  }

  export default class AutoSizer extends React.Component<AutoSizerProps> {}
} 