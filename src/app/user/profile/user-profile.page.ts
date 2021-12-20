import { Component, OnInit, HostBinding } from "@angular/core";
import { ActivatedRoute, NavigationExtras, Router } from "@angular/router";
import { Subscription } from "rxjs";

import {
  IResolvedRouteData,
  ResolverHelper,
} from "../../utils/resolver-helper";
import { UserProfileModel } from "./user-profile.model";
import { AlertController, NavController } from "@ionic/angular";

import { LanguageService } from "../../language/language.service";
import { TranslateService } from "@ngx-translate/core";
import { switchMap } from "rxjs/operators";
import { DonateService } from "../../donate/donate.service";
import { AngularFireAuth } from "@angular/fire/auth";

@Component({
  selector: "app-user-profile",
  templateUrl: "./user-profile.page.html",
  styleUrls: [
    "./styles/user-profile.page.scss",
    "./styles/user-profile.shell.scss",
    "./styles/user-profile.ios.scss",
    "./styles/user-profile.md.scss",
  ],
})
export class UserProfilePage implements OnInit {
  // Gather all component subscription in one place. Can be one Subscription or multiple (chained using the Subscription.add() method)
  subscriptions: Subscription;

  profile: UserProfileModel;
  available_languages = [];
  translations;

  projects: any[];

  data: any[];

  //stats
  totalAmount: number;
  totalContributors: number;

  @HostBinding("class.is-shell") get isShell() {
    return this.profile && this.profile.isShell ? true : false;
  }

  constructor(
    private route: ActivatedRoute,
    public translate: TranslateService,
    public languageService: LanguageService,
    public alertController: AlertController,
    private nav: Router,
    private firestore: DonateService,
    private angularFire: AngularFireAuth
  ) {
    this.projects = [];
    this.totalAmount = 0;
    this.totalContributors = 0;
  }

  loadProjects() {
    return this.firestore.getCollection("projects").subscribe((data) => {
      this.projects = data;
    });
  }

  loadSlideData() {
    return this.firestore.getCollection("slides").subscribe((slides) => {
      this.data = slides;
    });
  }

  loadDonations() {
    return this.firestore.getCollection("donations").subscribe((data: any) => {
      this.totalAmount = 0;
      this.totalContributors = 0;

      data.forEach((element) => {
        this.totalAmount += element.amount;
        this.totalContributors += 1;
      });
    });
  }

  openProject(project: any) {
    let navigationExtras: NavigationExtras = {
      state: {
        project: project,
      },
    };

    this.nav.navigate(["/contact-card"], navigationExtras);
  }

  ngOnInit(): void {
    this.loadSlideData();
    this.loadProjects();
    this.loadDonations();
    this.subscriptions = this.route.data
      .pipe(
        // Extract data for this page
        switchMap((resolvedRouteData: IResolvedRouteData<UserProfileModel>) => {
          return ResolverHelper.extractData<UserProfileModel>(
            resolvedRouteData.data,
            UserProfileModel
          );
        })
      )
      .subscribe(
        (state) => {
          this.profile = state;

          // get translations for this page to use in the Language Chooser Alert
          this.getTranslations();
        },
        (error) => console.log(error)
      );

    this.translate.onLangChange.subscribe(() => this.getTranslations());
  }

  // NOTE: Ionic only calls ngOnDestroy if the page was popped (ex: when navigating back)
  // Since ngOnDestroy might not fire when you navigate from the current page, use ionViewWillLeave to cleanup Subscriptions
  ionViewWillLeave(): void {
    this.subscriptions.unsubscribe();
  }

  getTranslations() {
    // get translations for this page to use in the Language Chooser Alert
    this.translate
      .getTranslation(this.translate.currentLang)
      .subscribe((translations) => (this.translations = translations));
  }

  async openLanguageChooser() {
    this.available_languages = this.languageService
      .getLanguages()
      .map((item) => ({
        name: item.name,
        type: "radio",
        label: item.name,
        value: item.code,
        checked: item.code === this.translate.currentLang,
      }));

    const alert = await this.alertController.create({
      header: this.translations.SELECT_LANGUAGE,
      inputs: this.available_languages,
      cssClass: "language-alert",
      buttons: [
        {
          text: this.translations.CANCEL,
          role: "cancel",
          cssClass: "secondary",
          handler: () => {},
        },
        {
          text: this.translations.OK,
          handler: (data) => {
            if (data) {
              this.translate.use(data);
            }
          },
        },
      ],
    });
    await alert.present();
  }
}

