import {Component} from '@angular/core';
import {Platform} from '@ionic/angular';
import {AppVersion} from '@ionic-native/app-version/ngx';
import {Device} from '@ionic-native/device/ngx';

@Component({
  selector: 'page-about',
  templateUrl: 'about.html'
})
export class AboutPage {
  readonly isOnDevice: boolean;
  packageName: string;
  versionNumber: string;

  constructor(
    private platform: Platform,
    private appVersion: AppVersion,
    public device: Device
  ) {
    this.isOnDevice = this.platform.is('cordova');
    // The appVersion can only be retrieved on the device
    // This check prevents a cordova_not_available exception in web browsers
    // TODO allow package name / version number to be shown in web browsers
    if (this.isOnDevice) {
      this.appVersion.getPackageName().then(name => this.packageName = name);
      this.appVersion.getVersionNumber().then(num => this.versionNumber = num);
    }
  }
}
