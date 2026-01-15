import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Button } from '@ui/button/button';

// Avoid re-creating object on every component instantiation. Let module re-use.
const MESSAGE_MAP: Record<string, { title: string; message: string }> = 
{
    invalid_request: 
    {
      title: 'Invalid request',
      message: 'The login request was invalid.'
    },
    not_subscribed: 
    {
      title: 'Subscription required',
      message: 'You must be subscribed to access this app.'
    },
    auth_failed: 
    {
      title: 'Authentication failed',
      message: 'Please try logging in again.'
    },
    unknown: 
    {
      title: 'Something went wrong',
      message: 'Please try again later.'
    }
  };

@Component({
  selector: 'app-error',
  imports: [Button],
  templateUrl: './error.html',
  styleUrl: './error.scss',
})
export class Error
{
  private route = inject(ActivatedRoute);

  private readonly messageMap = MESSAGE_MAP;

  readonly errorCode =
    this.route.snapshot.queryParamMap.get('code') ??
    this.route.snapshot.queryParamMap.get('error') ??
    'unknown';

  readonly error = this.messageMap[this.errorCode] ?? this.messageMap['unknown'];
}
