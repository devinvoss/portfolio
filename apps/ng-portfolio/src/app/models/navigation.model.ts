export interface INavigation {
  route?: string;
  name: string;
  type: NavigationType;
  items?: INavigation[];
  isActive: boolean;
  isOpen: boolean;
  action: () => void;
}

export enum NavigationType {
  Internal = 'internal',
  External = 'external',
  Menu = 'menu',
  Action = 'action'
}
