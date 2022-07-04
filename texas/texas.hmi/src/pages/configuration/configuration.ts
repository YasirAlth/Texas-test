import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { ConfigService } from 'src/services/config';
import {Agency, Category, Settings} from 'src/interfaces';
import {Observable, Observer, Subject, Subscription} from 'rxjs';
import {Router} from '@angular/router';
import {isNullOrUndefined} from '../../functions/Utils';
import {MissionDataService} from '../../services/mission-data.service';

@Component({
    selector: 'page-configuration',
    templateUrl: 'configuration.html'
})

export class ConfigurationPage implements OnInit, OnDestroy {

  configFormGroup: FormGroup;
  settings: Settings;
  subscriptions = new Subscription();
  currentAgency: Agency;
  currentCategory: string;
  currentRole: string;
  currentName: string;

  roles: Role[] = [
    {value: 'Active Participant', viewValue: 'Active'},
    {value: 'Observer', viewValue: 'Observer'}
  ];


  catSubject = new Subject<Array<Category>>();
  catObserver = this.catSubject.asObservable();
  selectedAgency: string;


  constructor(public config: ConfigService,
              private missionData: MissionDataService,
              private router: Router) {

    Promise.all([this.config.configLoaded, this.missionData.missionDataLoaded]).then(() => {
      this.subscriptions.add(this.config.settingsChanged$.subscribe((settings: Settings) => {
        if (isNullOrUndefined(settings)) { return; }
        this.settings = settings;
        this.displayCurrentState();
      }));
    });
   }

  ngOnInit() {
    this.configFormGroup = new FormGroup({
      agencyCtrl: new FormControl(),
      categoryCtrl: new FormControl(),
      roleCtrl: new FormControl(),
      nameCtrl: new FormControl()
    });
  }

  displayCurrentState() {
    this.currentAgency = this.config.agencies.find(a => a.agencyId === this.settings.agencyId);
    this.configFormGroup.get('agencyCtrl').setValue(this.currentAgency.agencyAbbr);
    this.selectedAgency = this.currentAgency.agencyAbbr;

    this.currentCategory = this.config.categories.find(c => c.categoryId === this.settings.categoryId).categoryName;
    this.configFormGroup.get('categoryCtrl').setValue(this.currentCategory);

    this.currentRole = this.roles[Number(this.config.settings.observer)].viewValue;
    this.configFormGroup.get('roleCtrl').setValue(this.currentRole);

    this.currentName = this.settings.deviceName;
    this.configFormGroup.get('nameCtrl').setValue(this.currentName);

    this.updateCategories();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  onSubmit() {
    console.log('Submitted Configuration Page Form Values');
    console.log(this.configFormGroup.value);

    // Selection uses agency's abbreviated name, need to lookup the agencyId this corresponds to, in order to update settings
    // If we change the selection to display the full agency name, rather than the abbreviation, then the lookup will need to be changed
    const agency = this.config.agencies.find(a => a.agencyAbbr === this.configFormGroup.get('agencyCtrl').value);
    this.settings.agencyId = agency.agencyId;

    // Selection uses category's name, need to lookup the categoryId this corresponds to, in order to update settings
    const category = this.config.categories.find(c => c.categoryName === this.configFormGroup.get('categoryCtrl').value);
    this.settings.categoryId = category.categoryId;
    // Update the observer state
    if (this.configFormGroup.get('roleCtrl').value === 'Active') {
      this.settings.observer = false;
    } else {
      // undefined not likely to occur given the mat select control in place, however it will, with 'Observor' get observation mode
      this.settings.observer = true;
    }

    this.settings.deviceName = this.configFormGroup.get('nameCtrl').value;

    // Set firstRun to false, however do this only if previous state was true, otherwise the property name is a misnomer
    if (this.settings.firstRun === true) {
      this.settings.firstRun = false;
    }

    this.config.settings = this.settings;

    setTimeout(() => {
      this.router.navigate(['/']);
    }, 2000);
  }

  updateCategories() {
    this.currentAgency = this.config.agencies.find(a => a.agencyAbbr === this.selectedAgency);

    if (!isNullOrUndefined(this.config.categories)) {
      if (isNullOrUndefined(this.currentAgency)) {
        this.catSubject.next(this.config.categories);
      } else {
        const filtered = this.config.categories.filter(cat => this.currentAgency.categories.includes(cat.categoryId));
        this.catSubject.next(filtered);
        const category = filtered.find(c => c.categoryName === this.configFormGroup.get('categoryCtrl').value);
        if (isNullOrUndefined(category) && filtered.length > 0) {
          this.currentCategory = filtered[0].categoryName;
          this.configFormGroup.get('categoryCtrl').setValue(this.currentCategory);
        }
      }
    }
  }
}

export interface Role {
  value: string;
  viewValue: string;
}
