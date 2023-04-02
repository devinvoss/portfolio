export interface IToast {
  title: string;
  message: string;
  duration: number;
  class: string;
  icon: string;
}

export class Toast implements IToast {
  id!: number;
  title!: string;
  message!: string;
  duration!: number;
  class!: string;
  icon!: string;

  constructor(model: IToast) {
    Object.assign(this, model);
  }
}
