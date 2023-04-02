import { trigger, transition, style, animate, AnimationTriggerMetadata } from "@angular/animations";

export function fadeInAnimation(): AnimationTriggerMetadata {
  return trigger('fadeIn', [
    transition(':enter', [
      style({ opacity: 0 }),
      animate('.3s', style({ opacity: 1 }))
    ])
  ])
}