import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'minutes',
  standalone: true
})
export class MinutesPipe implements PipeTransform {

  transform(value: number): string {
    const hours = Math.floor(value/60);
    const minutes = value % 60;
    let response = '';
    if (hours > 0) {
      response += `${hours}h `;
    }
    response += `${minutes}m`;
    return response;
  }

}
