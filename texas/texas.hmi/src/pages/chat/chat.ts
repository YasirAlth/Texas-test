import { Component } from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {ConfigService} from '../../services/config';
import { DomSanitizer} from '@angular/platform-browser';
import {catchError, map} from 'rxjs/operators';

@Component({
  selector: 'page-chat',
  templateUrl: 'chat.html',
})
export class ChatPage {

  authData: any;

  public rocketChatIframeURL: string;

  constructor(public http: HttpClient,
              private config: ConfigService,
              private sanitizer: DomSanitizer) {
    this.rocketChatIframeURL = this.config.settings.rocketChatServer + '/channel/general?layout=embedded';
  }

  private loginChatServer(): Observable<any> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    return this.http.post(this.config.settings.rocketChatServer + '/api/v1/login',
      JSON.stringify({ username: this.config.settings.deviceName, password: this.config.settings.deviceName }), httpOptions).pipe(
      map((res: any) => {
        const result = res;
        if (result.status === 'success') {

          this.authData = res.data;
          const iframe = document.querySelector('iframe');

          // // TODO perhaps need a better solution? Anyway, lets wait a second for the frame to properly load.
          window.setTimeout(() => {
            iframe.contentWindow.postMessage({
              event: 'login-with-token',
              loginToken: this.authData.authToken
            }, '*');
          }, 1000);
        }
        return result;
      }),
      catchError(error => {
          return throwError(error);
    }));
  }

  ionViewDidLoad() {

  }

  login() {
    this.loginChatServer().toPromise().catch(error => console.log(error));
  }
}
