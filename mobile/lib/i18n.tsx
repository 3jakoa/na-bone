import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "./supabase";

export type Language = "sl" | "en";

const LANGUAGE_STORAGE_KEY = "boni-buddy:language";
const DEFAULT_LANGUAGE: Language = "sl";

type Params = Record<string, string | number>;

type LanguageContextValue = {
  language: Language;
  ready: boolean;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: TranslationKey, params?: Params) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const translations = {
  sl: {
    "common.error": "Napaka",
    "common.ok": "V redu",
    "common.cancel": "Prekliči",
    "common.back": "Nazaj",
    "common.save": "Shrani",
    "common.saving": "Shranjujem...",
    "common.loadingDots": "...",
    "common.retry": "Poskusi znova",
    "common.skip": "Preskoči",
    "common.next": "Naprej",
    "common.logout": "Odjava",
    "common.stay": "Ostani",
    "common.leave": "Zapusti",
    "common.remove": "Odstrani",
    "common.block": "Blokiraj",
    "common.unblock": "Odblokiraj",
    "common.choose": "Izberi",
    "common.public": "Javno",
    "common.private": "Zasebno",
    "common.email": "E-mail",
    "common.password": "Geslo",
    "common.bio": "Bio",
    "common.language": "Jezik",
    "common.slovenian": "Slovenščina",
    "common.english": "English",
    "common.today": "Danes",
    "common.tomorrow": "Jutri",
    "common.yesterday": "Včeraj",
    "common.youPrefix": "Ti: ",
    "common.your": "Tvoj",
    "common.yourBon": "Tvoj bon",
    "common.buddies": "Buddies",
    "common.profile": "Profil",
    "common.boni": "Boni",
    "common.buddy": "Buddy",
    "common.atTime": "ob {time}",

    "tabs.discover": "Išči",
    "tabs.boni": "Boni",
    "tabs.matches": "Buddies",
    "tabs.profile": "Profil",

    "language.selectLabel": "Jezik aplikacije",
    "language.saved": "Jezik je posodobljen.",

    "auth.tagline": "Najdi družbo za bone. 🎓",
    "auth.loginTitle": "Prijava",
    "auth.signupTitle": "Registracija",
    "auth.forgotPassword": "Pozabil/a sem geslo",
    "auth.loginButton": "Prijava",
    "auth.signupButton": "Registracija",
    "auth.loggingIn": "Prijavljam...",
    "auth.signingUp": "Registriram...",
    "auth.or": "ali",
    "auth.continueGoogle": "Nadaljuj z Googlom",
    "auth.noAccount": "Nimaš računa? Registracija",
    "auth.noAccountPrompt": "Nimaš računa?",
    "auth.hasAccount": "Že imaš račun? Prijava",
    "auth.hasAccountPrompt": "Že imaš račun?",
    "auth.confirmPassword": "Ponovi geslo",
    "auth.passwordTooShort": "Geslo mora imeti vsaj 8 znakov.",
    "auth.passwordMismatch": "Gesli se ne ujemata.",
    "auth.forgotTitle": "Pozabljeno geslo",
    "auth.forgotSubtitle": "Vnesi e-mail in poslali ti bomo povezavo za novo geslo.",
    "auth.enterAccountEmail": "Vnesi e-mail naslov za svoj račun.",
    "auth.sending": "Pošiljam...",
    "auth.sendLink": "Pošlji povezavo",
    "auth.checkEmailTitle": "Preveri e-mail",
    "auth.checkEmailBody": "Če račun obstaja, smo ti poslali povezavo za nastavitev novega gesla.",
    "auth.backToLogin": "Nazaj na prijavo",
    "auth.resetInvalid": "Povezava za ponastavitev ni veljavna.",
    "auth.openEmailLink": "Odpri povezavo iz e-maila za ponastavitev gesla.",
    "auth.linkNotWorking": "Povezava ne deluje",
    "auth.sendNewLink": "Pošlji novo povezavo",
    "auth.checkingLink": "Preverjam povezavo...",
    "auth.newPassword": "Novo geslo",
    "auth.newPasswordSubtitle": "Izberi novo geslo za svoj Boni Buddy račun.",
    "auth.minEightChars": "Vsaj 8 znakov",
    "auth.repeatNewPassword": "Ponovi novo geslo",
    "auth.saveNewPassword": "Shrani novo geslo",
    "auth.passwordChangedTitle": "Geslo spremenjeno",
    "auth.passwordChangedBody": "Zdaj se lahko prijaviš z novim geslom.",

    "bootstrap.startError": "Pri zagonu aplikacije je prišlo do napake.",
    "bootstrap.offlineTitle": "Ni internetne povezave",
    "bootstrap.offlineBody": "Za uporabo aplikacije vklopi internetno povezavo.",
    "bootstrap.offlineHint": "Ko bo povezava znova na voljo, lahko nadaljuješ brez ponovnega prijavljanja.",
    "bootstrap.profileLoadFailed": "Ne morem naložiti profila",

    "onboarding.requiredBasics": "Izpolni ime, starost in spol.",
    "onboarding.requiredSchool": "Izberi univerzo in fakulteto.",
    "onboarding.stepWhoTitle": "Kdo si?",
    "onboarding.stepWhoSubtitle": "Povej nam nekaj o sebi",
    "onboarding.name": "Ime",
    "onboarding.namePlaceholder": "Tvoje ime",
    "onboarding.age": "Starost",
    "onboarding.gender": "Spol",
    "onboarding.genderMale": "moški",
    "onboarding.genderFemale": "ženska",
    "onboarding.genderOther": "drugo",
    "onboarding.schoolTitle": "Kje študiraš?",
    "onboarding.schoolSubtitle": "Izberi univerzo in fakulteto",
    "onboarding.university": "Univerza",
    "onboarding.faculty": "Fakulteta",
    "onboarding.educationTitle": "Stopnja študija",
    "onboarding.educationSubtitle": "Na kateri stopnji si?",
    "onboarding.eduUndergrad": "Dodiplomski",
    "onboarding.eduMasters": "Magistrski",
    "onboarding.eduDoctoral": "Doktorski",
    "onboarding.photoTitle": "Dodaj sliko",
    "onboarding.photoSubtitle": "Pokaži se - ni pa obvezno",
    "onboarding.addPhoto": "Dodaj sliko",
    "onboarding.aboutTitle": "Še kaj o tebi?",
    "onboarding.aboutSubtitle": "Kratka bio - opcijsko",
    "onboarding.bioPlaceholder": "FRI študent, rad jem burek...",
    "onboarding.start": "Začni!",
    "onboarding.skipBio": "Preskoči bio",
    "onboarding.logoutPrompt": "Se želiš odjaviti in uporabiti drug račun?",

    "discover.rightSwipeLimit": "Porabil si vse današnje buddyje. Jutri lahko spet iščeš buddyja.",
    "discover.addPhotoTitle": "Dodaj sliko",
    "discover.addPhotoBody": "Dodaj vsaj eno sliko, da lahko swipaš.",
    "discover.later": "Kasneje",
    "discover.matchTitle": "Match!",
    "discover.matchBody": "Ujel/a si se z {name}.",
    "discover.openChat": "Odpri chat",
    "discover.noProfiles": "Ni več profilov",
    "discover.checkLater": "Preveri znova pozneje",
    "discover.nextBadge": "Naprej",
    "discover.instructions": "Povleci levo za naprej, desno za buddyja",
    "discover.tapForMore": "Tapni kartico za več informacij",

    "feed.leaveCreateTitle": "Zapuščaš ustvarjanje bona",
    "feed.leaveCreateBody": "Vsi podatki se bodo ponastavili.",
    "feed.leaveCreateQuestion": "Vsi podatki se bodo ponastavili. Želiš nadaljevati?",
    "feed.inviteNoChat": "Povabilo nima pogovora.",
    "feed.cancelBonTitle": "Umakni bon?",
    "feed.cancelBonBody": "Bon ne bo več prikazan drugim uporabnikom.",
    "feed.cancelBon": "Umakni",
    "feed.cancelBonLong": "Umakni bon",
    "feed.cancelFailed": "Tega bona trenutno ni mogoče umakniti.",
    "feed.noActive": "Ni aktivnih bonov",
    "feed.noActiveBody": "Bodi prvi in objavi nov bon za kosilo.",
    "feed.openChat": "Odpri chat",
    "feed.openedCount": "{count} odprli",
    "feed.publicBon": "Javni bon",
    "feed.privateBon": "Zasebni bon",

    "composer.createBon": "Ustvari bon",
    "composer.cancel": "Cancel",
    "composer.publish": "Objavi",
    "composer.where": "Kam na bone?",
    "composer.day": "Dan",
    "composer.descriptionAdded": "Opis dodan",
    "composer.addDescription": "Dodaj opis",
    "composer.privateOne": "Ta bon bo videl 1 buddy.",
    "composer.privateMany": "Ta bon bo videlo {count} buddyjev.",
    "composer.privateNone": "Za zaseben bon potrebuješ vsaj enega buddyja.",
    "composer.chooseDay": "Izberi dan",
    "composer.chooseTime": "Izberi uro",
    "composer.noTimes": "Za ta dan ni več prostih terminov. Izberi drug dan.",
    "composer.chooseVisibility": "Izberi vidnost",
    "composer.everyoneSees": "Vsi vidijo",
    "composer.onlyBuddies": "Samo buddies",
    "composer.addNoteOptional": "Dodaj opis (opcijsko)",
    "composer.notePlaceholder": "Npr. Iščem družbo za kosilo...",
    "composer.enterLocation": "Vpiši kam na bone.",
    "composer.chooseSlot": "Izberi termin.",
    "composer.chooseVisibilityToast": "Izberi vidnost.",
    "composer.timePast": "Izbrani čas je že mimo.",
    "composer.chooseFuture": "Izberi čas v prihodnosti.",
    "composer.profileUnavailable": "Profila trenutno ni mogoče naložiti.",
    "composer.noBuddies": "Še nimaš buddyjev.",
    "composer.published": "Objavljeno!",
    "composer.buddiesSee": "Tvoji buddyji vidijo tvoj bon.",
    "composer.bonPublished": "Tvoj bon je objavljen.",
    "composer.blockedBuddies": "Nekaterih buddyjev zaradi blokade ni mogoče vključiti v zaseben bon.",
    "composer.noEligibleBuddies": "Ni nobenega veljavnega buddyja za zaseben bon.",

    "matches.loadError": "Pogovorov trenutno ni mogoče naložiti.",
    "matches.addBuddy": "Dodaj buddyja",
    "matches.inviteFailed": "Povabila trenutno ni mogoče ustvariti.",
    "matches.shareText": "Dodaj me kot buddyja na Boni Buddy: {url}",
    "matches.tryAgainLater": "Poskusi znova čez trenutek.",
    "matches.noMatches": "Še ni matchev",
    "matches.noMatchesBody": "Swipaj ali dodaj buddyja z linkom",
    "matches.sayHi": "Pozdravita se 👋",
    "matches.conversationOne": "pogovor",
    "matches.conversationMany": "pogovorov",

    "chat.sending": "Pošiljanje...",
    "chat.sent": "Poslano",
    "chat.seen": "Videno",
    "chat.removedTitle": "Buddy odstranjen",
    "chat.removedDefault": "Ta buddy ni več na voljo.",
    "chat.removedBody": "Ta buddy je bil odstranjen.",
    "chat.removeBuddy": "Odstrani buddyja",
    "chat.removeBuddyConfirm": "Ali res želiš odstraniti {name}?",
    "chat.messagePlaceholder": "Sporočilo...",
    "chat.previousInvite": "Prejšnje povabilo",
    "chat.bonInvite": "Povabilo na bon: {restaurant}",
    "chat.viewProfile": "Poglej profil",
    "chat.blockUser": "Blokiraj uporabnika",
    "chat.blockConfirm": "Ali želiš blokirati {name}? Ne bo mogel/la videti tvojih objav ali ti pisati.",

    "invite.invalid": "Povezava ni več veljavna.",
    "invite.acceptFailed": "Povabila ni mogoče sprejeti.",
    "invite.brokenTitle": "Povabilo ne deluje",
    "invite.invitesYou": "{name} te vabi",
    "invite.someone": "Nekdo",
    "invite.body": "Sprejmi povabilo, da postaneta buddyja in se lahko dogovorita za bone.",
    "invite.backToApp": "Nazaj v aplikacijo",
    "invite.accepting": "Sprejemam...",
    "invite.accept": "Sprejmi povabilo",

    "profile.aboutMe": "O meni",
    "profile.noBio": "Še nisi dodal/a bio-ja. Uredi profil!",
    "profile.photos": "Slike",
    "profile.gender": "Spol",
    "profile.faculty": "Fakulteta",
    "profile.university": "Univerza",
    "profile.educationLevel": "Stopnja",
    "profile.notifications": "Obvestila",
    "profile.privacy": "Zasebnost",
    "profile.blockedUsers": "Blokirani uporabniki",
    "profile.help": "Pomoč",
    "profile.terms": "Pogoji uporabe",
    "profile.edit": "Uredi profil",
    "profile.main": "Glavna",
    "profile.maxPhotos": "Največ 6 slik.",
    "profile.fillNameAge": "Izpolni ime in starost.",
    "profile.somethingAboutYou": "Nekaj o sebi...",

    "profileDetail.unblockTitle": "Odblokiraj",
    "profileDetail.unblockConfirm": "Ali želiš odblokirati {name}?",
    "profileDetail.blockTitle": "Blokiraj",
    "profileDetail.blockConfirm": "Ali želiš blokirati {name}? Ne bo mogel/la videti tvojih objav ali ti pisati.",
    "profileDetail.unblockUser": "Odblokiraj uporabnika",
    "profileDetail.blockUser": "Blokiraj uporabnika",

    "settings.buddiesTitle": "Moji buddyji",
    "settings.noBuddies": "Še nimaš buddyjev",
    "settings.swipeToFind": "Swipaj da jih najdeš!",
    "settings.removeBuddyTitle": "Odstrani buddyja",
    "settings.removeBuddyConfirm": "Ali res želiš odstraniti {name}?",
    "settings.sendMessage": "Pošlji sporočilo",
    "settings.viewProfile": "Poglej profil",
    "settings.blockUser": "Blokiraj uporabnika",
    "settings.blockedTitle": "Blokirani uporabniki",
    "settings.noBlocked": "Ni blokiranih uporabnikov",
    "settings.notificationsTitle": "Obvestila",
    "settings.newBoni": "Novi boni",
    "settings.newBoniDesc": "Ko buddy objavi nov bon",
    "settings.newMatches": "Novi matchi",
    "settings.newMatchesDesc": "Ko dobiš novega buddyja",
    "settings.messages": "Sporočila",
    "settings.messagesDesc": "Nova sporočila od buddyjev",
    "settings.notificationsHint": "Obvestila upravljaš tudi v nastavitvah sistema.",
    "settings.privacyTitle": "Zasebnost",
    "settings.showAge": "Prikaži starost",
    "settings.showBio": "Prikaži bio",
    "settings.showUniversity": "Prikaži univerzo",
    "settings.logoutConfirm": "Ali se želiš odjaviti iz računa?",
    "settings.privacyHint": "Nastavitve zasebnosti se shranjujejo lokalno. Polna podpora bo na voljo kmalu.",
    "settings.helpTitle": "Pomoč",
    "settings.faq": "Pogosta vprašanja",
    "settings.contact": "Kontakt",
    "settings.feedback": "Povratne informacije",
    "settings.mailUnavailable": "Mail ni na voljo",
    "settings.mailUnavailableBody": "V simulatorju pogosto ni nastavljene Mail aplikacije. Piši na {email}.",
    "settings.reportBug": "Prijavi napako",
    "settings.reportBugDesc": "Pomagaj nam izboljšati aplikacijo",
    "settings.suggestFeature": "Predlagaj funkcijo",
    "settings.suggestFeatureDesc": "Povej nam kaj si želiš",
    "settings.termsTitle": "Pogoji uporabe",
    "settings.lastUpdated": "Zadnja posodobitev: april 2026",

    "faq.whatTitle": "Kaj je Boni Buddy?",
    "faq.whatBody": "Boni Buddy je aplikacija, ki študentom pomaga najti družbo za kosilo na študentske bone. Swipaj profile, se poveži in skupaj pojejta kosilo!",
    "faq.boniTitle": "Kako delujejo boni?",
    "faq.boniBody": "Objavi bon z lokacijo ali delom mesta in časom - drugi študentje se lahko pridružijo. Lahko objaviš javno (vsi vidijo) ali zasebno (samo tvoji buddyji).",
    "faq.buddyTitle": "Kako dobim buddyja?",
    "faq.buddyBody": "Na zavihku Išči swipaj desno na profile, ki ti ustrezajo. Če oba swipata desno, postaneta buddyja in si lahko pišeta.",
    "faq.emailTitle": "Ali potrebujem študentski e-mail?",
    "faq.emailBody": "Za zdaj ne, ampak v prihodnosti bomo zahtevali študentski e-mail za verifikacijo.",
    "faq.deleteTitle": "Kako izbrišem svoj račun?",
    "faq.deleteBody": "Pojdi na Profil > Zasebnost > Izbriši račun. Tvoji podatki bodo trajno odstranjeni.",
    "faq.reportTitle": "Kako prijavim neprimerno vsebino?",
    "faq.reportBody": "Piši nam na {email} z opisom situacije. Vsako prijavo obravnavamo resno.",
    "faq.freeTitle": "Ali je aplikacija brezplačna?",
    "faq.freeBody": "Da! Boni Buddy je popolnoma brezplačen za vse študente.",

    "terms.generalTitle": "1. Splošno",
    "terms.generalBody": "Boni Buddy je mobilna aplikacija namenjena povezovanju študentov pri koriščenju študentskih bonov. Z uporabo aplikacije se strinjate s temi pogoji.",
    "terms.accountTitle": "2. Uporabniški račun",
    "terms.accountBody": "Za uporabo aplikacije potrebujete veljaven študentski e-mail naslov. Odgovorni ste za varnost svojega računa in vseh aktivnosti pod njim.",
    "terms.contentTitle": "3. Vsebina",
    "terms.contentBody": "Uporabniki so odgovorni za vsebino, ki jo objavljajo. Prepovedana je objava žaljive, diskriminatorne ali nezakonite vsebine.",
    "terms.privacyTitle": "4. Zasebnost",
    "terms.privacyBody": "Vaše osebne podatke obdelujemo v skladu z GDPR. Podrobnosti najdete v naši politiki zasebnosti.",
    "terms.liabilityTitle": "5. Omejitev odgovornosti",
    "terms.liabilityBody": "Boni Buddy ne prevzema odgovornosti za interakcije med uporabniki zunaj aplikacije ali za morebitne škode nastale pri uporabi.",
    "terms.changesTitle": "6. Spremembe pogojev",
    "terms.changesBody": "Pridržujemo si pravico do spremembe teh pogojev. O bistvenih spremembah bomo uporabnike obvestili prek aplikacije.",
  },
  en: {
    "common.error": "Error",
    "common.ok": "OK",
    "common.cancel": "Cancel",
    "common.back": "Back",
    "common.save": "Save",
    "common.saving": "Saving...",
    "common.loadingDots": "...",
    "common.retry": "Try again",
    "common.skip": "Skip",
    "common.next": "Next",
    "common.logout": "Log out",
    "common.stay": "Stay",
    "common.leave": "Leave",
    "common.remove": "Remove",
    "common.block": "Block",
    "common.unblock": "Unblock",
    "common.choose": "Choose",
    "common.public": "Public",
    "common.private": "Private",
    "common.email": "Email",
    "common.password": "Password",
    "common.bio": "Bio",
    "common.language": "Language",
    "common.slovenian": "Slovenščina",
    "common.english": "English",
    "common.today": "Today",
    "common.tomorrow": "Tomorrow",
    "common.yesterday": "Yesterday",
    "common.youPrefix": "You: ",
    "common.your": "Yours",
    "common.yourBon": "Your bon",
    "common.buddies": "Buddies",
    "common.profile": "Profile",
    "common.boni": "Boni",
    "common.buddy": "Buddy",
    "common.atTime": "at {time}",

    "tabs.discover": "Discover",
    "tabs.boni": "Boni",
    "tabs.matches": "Buddies",
    "tabs.profile": "Profile",

    "language.selectLabel": "App language",
    "language.saved": "Language updated.",

    "auth.tagline": "Find company for student meals. 🎓",
    "auth.loginTitle": "Log in",
    "auth.signupTitle": "Sign up",
    "auth.forgotPassword": "Forgot password",
    "auth.loginButton": "Log in",
    "auth.signupButton": "Sign up",
    "auth.loggingIn": "Logging in...",
    "auth.signingUp": "Signing up...",
    "auth.or": "or",
    "auth.continueGoogle": "Continue with Google",
    "auth.noAccount": "No account? Sign up",
    "auth.noAccountPrompt": "No account?",
    "auth.hasAccount": "Already have an account? Log in",
    "auth.hasAccountPrompt": "Already have an account?",
    "auth.confirmPassword": "Repeat password",
    "auth.passwordTooShort": "Password must be at least 8 characters.",
    "auth.passwordMismatch": "Passwords do not match.",
    "auth.forgotTitle": "Forgot password",
    "auth.forgotSubtitle": "Enter your email and we will send you a link to set a new password.",
    "auth.enterAccountEmail": "Enter the email address for your account.",
    "auth.sending": "Sending...",
    "auth.sendLink": "Send link",
    "auth.checkEmailTitle": "Check your email",
    "auth.checkEmailBody": "If the account exists, we sent you a link to set a new password.",
    "auth.backToLogin": "Back to login",
    "auth.resetInvalid": "The reset link is not valid.",
    "auth.openEmailLink": "Open the password reset link from your email.",
    "auth.linkNotWorking": "Link does not work",
    "auth.sendNewLink": "Send a new link",
    "auth.checkingLink": "Checking link...",
    "auth.newPassword": "New password",
    "auth.newPasswordSubtitle": "Choose a new password for your Boni Buddy account.",
    "auth.minEightChars": "At least 8 characters",
    "auth.repeatNewPassword": "Repeat new password",
    "auth.saveNewPassword": "Save new password",
    "auth.passwordChangedTitle": "Password changed",
    "auth.passwordChangedBody": "You can now log in with your new password.",

    "bootstrap.startError": "Something went wrong while starting the app.",
    "bootstrap.offlineTitle": "No internet connection",
    "bootstrap.offlineBody": "Turn on your internet connection to use the app.",
    "bootstrap.offlineHint": "When the connection is back, you can continue without logging in again.",
    "bootstrap.profileLoadFailed": "Cannot load profile",

    "onboarding.requiredBasics": "Fill in your name, age and gender.",
    "onboarding.requiredSchool": "Choose your university and faculty.",
    "onboarding.stepWhoTitle": "Who are you?",
    "onboarding.stepWhoSubtitle": "Tell us a bit about yourself",
    "onboarding.name": "Name",
    "onboarding.namePlaceholder": "Your name",
    "onboarding.age": "Age",
    "onboarding.gender": "Gender",
    "onboarding.genderMale": "male",
    "onboarding.genderFemale": "female",
    "onboarding.genderOther": "other",
    "onboarding.schoolTitle": "Where do you study?",
    "onboarding.schoolSubtitle": "Choose your university and faculty",
    "onboarding.university": "University",
    "onboarding.faculty": "Faculty",
    "onboarding.educationTitle": "Study level",
    "onboarding.educationSubtitle": "Which level are you at?",
    "onboarding.eduUndergrad": "Undergraduate",
    "onboarding.eduMasters": "Master's",
    "onboarding.eduDoctoral": "Doctoral",
    "onboarding.photoTitle": "Add a photo",
    "onboarding.photoSubtitle": "Show yourself - optional",
    "onboarding.addPhoto": "Add photo",
    "onboarding.aboutTitle": "Anything else?",
    "onboarding.aboutSubtitle": "Short bio - optional",
    "onboarding.bioPlaceholder": "Exchange student, always up for boni...",
    "onboarding.start": "Start!",
    "onboarding.skipBio": "Skip bio",
    "onboarding.logoutPrompt": "Do you want to log out and use another account?",

    "discover.rightSwipeLimit": "You used all today's buddies. You can discover more tomorrow.",
    "discover.addPhotoTitle": "Add a photo",
    "discover.addPhotoBody": "Add at least one photo before swiping.",
    "discover.later": "Later",
    "discover.matchTitle": "Match!",
    "discover.matchBody": "You matched with {name}.",
    "discover.openChat": "Open chat",
    "discover.noProfiles": "No more profiles",
    "discover.checkLater": "Check again later",
    "discover.nextBadge": "Next",
    "discover.instructions": "Swipe left to skip, right for buddy",
    "discover.tapForMore": "Tap the card for more info",

    "feed.leaveCreateTitle": "Leaving bon creation",
    "feed.leaveCreateBody": "All entered details will be reset.",
    "feed.leaveCreateQuestion": "All entered details will be reset. Do you want to continue?",
    "feed.inviteNoChat": "This invite has no chat.",
    "feed.cancelBonTitle": "Remove bon?",
    "feed.cancelBonBody": "This bon will no longer be shown to other users.",
    "feed.cancelBon": "Remove",
    "feed.cancelBonLong": "Remove bon",
    "feed.cancelFailed": "This bon cannot be removed right now.",
    "feed.noActive": "No active boni",
    "feed.noActiveBody": "Be first and post a new bon.",
    "feed.openChat": "Open chat",
    "feed.openedCount": "{count} opened",
    "feed.publicBon": "Public bon",
    "feed.privateBon": "Private bon",

    "composer.createBon": "Create bon",
    "composer.cancel": "Cancel",
    "composer.publish": "Post",
    "composer.where": "Where for boni?",
    "composer.day": "Day",
    "composer.descriptionAdded": "Description added",
    "composer.addDescription": "Add description",
    "composer.privateOne": "1 buddy will see this bon.",
    "composer.privateMany": "{count} buddies will see this bon.",
    "composer.privateNone": "You need at least one buddy for a private bon.",
    "composer.chooseDay": "Choose day",
    "composer.chooseTime": "Choose time",
    "composer.noTimes": "There are no available time slots for this day. Choose another day.",
    "composer.chooseVisibility": "Choose visibility",
    "composer.everyoneSees": "Everyone sees it",
    "composer.onlyBuddies": "Only buddies",
    "composer.addNoteOptional": "Add description (optional)",
    "composer.notePlaceholder": "E.g. Looking for boni company...",
    "composer.enterLocation": "Enter where you want to go for boni.",
    "composer.chooseSlot": "Choose a time slot.",
    "composer.chooseVisibilityToast": "Choose visibility.",
    "composer.timePast": "The selected time has already passed.",
    "composer.chooseFuture": "Choose a future time.",
    "composer.profileUnavailable": "Profile cannot be loaded right now.",
    "composer.noBuddies": "You do not have any buddies yet.",
    "composer.published": "Posted!",
    "composer.buddiesSee": "Your buddies can see your bon.",
    "composer.bonPublished": "Your bon is posted.",
    "composer.blockedBuddies": "Some buddies cannot be included in a private bon because of a block.",
    "composer.noEligibleBuddies": "There is no eligible buddy for a private bon.",

    "matches.loadError": "Chats cannot be loaded right now.",
    "matches.addBuddy": "Add buddy",
    "matches.inviteFailed": "The invite cannot be created right now.",
    "matches.shareText": "Add me as a buddy on Boni Buddy: {url}",
    "matches.tryAgainLater": "Try again in a moment.",
    "matches.noMatches": "No matches yet",
    "matches.noMatchesBody": "Swipe or add a buddy with a link",
    "matches.sayHi": "Say hi 👋",
    "matches.conversationOne": "chat",
    "matches.conversationMany": "chats",

    "chat.sending": "Sending...",
    "chat.sent": "Sent",
    "chat.seen": "Seen",
    "chat.removedTitle": "Buddy removed",
    "chat.removedDefault": "This buddy is no longer available.",
    "chat.removedBody": "This buddy was removed.",
    "chat.removeBuddy": "Remove buddy",
    "chat.removeBuddyConfirm": "Do you really want to remove {name}?",
    "chat.messagePlaceholder": "Message...",
    "chat.previousInvite": "Previous invite",
    "chat.bonInvite": "Bon invite: {restaurant}",
    "chat.viewProfile": "View profile",
    "chat.blockUser": "Block user",
    "chat.blockConfirm": "Do you want to block {name}? They will not be able to see your posts or message you.",

    "invite.invalid": "This link is no longer valid.",
    "invite.acceptFailed": "The invite cannot be accepted.",
    "invite.brokenTitle": "Invite does not work",
    "invite.invitesYou": "{name} invited you",
    "invite.someone": "Someone",
    "invite.body": "Accept the invite to become buddies and plan boni together.",
    "invite.backToApp": "Back to app",
    "invite.accepting": "Accepting...",
    "invite.accept": "Accept invite",

    "profile.aboutMe": "About me",
    "profile.noBio": "You have not added a bio yet. Edit your profile!",
    "profile.photos": "Photos",
    "profile.gender": "Gender",
    "profile.faculty": "Faculty",
    "profile.university": "University",
    "profile.educationLevel": "Level",
    "profile.notifications": "Notifications",
    "profile.privacy": "Privacy",
    "profile.blockedUsers": "Blocked users",
    "profile.help": "Help",
    "profile.terms": "Terms of use",
    "profile.edit": "Edit profile",
    "profile.main": "Main",
    "profile.maxPhotos": "Maximum 6 photos.",
    "profile.fillNameAge": "Fill in your name and age.",
    "profile.somethingAboutYou": "Something about yourself...",

    "profileDetail.unblockTitle": "Unblock",
    "profileDetail.unblockConfirm": "Do you want to unblock {name}?",
    "profileDetail.blockTitle": "Block",
    "profileDetail.blockConfirm": "Do you want to block {name}? They will not be able to see your posts or message you.",
    "profileDetail.unblockUser": "Unblock user",
    "profileDetail.blockUser": "Block user",

    "settings.buddiesTitle": "My buddies",
    "settings.noBuddies": "You do not have buddies yet",
    "settings.swipeToFind": "Swipe to find them!",
    "settings.removeBuddyTitle": "Remove buddy",
    "settings.removeBuddyConfirm": "Do you really want to remove {name}?",
    "settings.sendMessage": "Send message",
    "settings.viewProfile": "View profile",
    "settings.blockUser": "Block user",
    "settings.blockedTitle": "Blocked users",
    "settings.noBlocked": "No blocked users",
    "settings.notificationsTitle": "Notifications",
    "settings.newBoni": "New boni",
    "settings.newBoniDesc": "When a buddy posts a new bon",
    "settings.newMatches": "New matches",
    "settings.newMatchesDesc": "When you get a new buddy",
    "settings.messages": "Messages",
    "settings.messagesDesc": "New messages from buddies",
    "settings.notificationsHint": "You can also manage notifications in system settings.",
    "settings.privacyTitle": "Privacy",
    "settings.showAge": "Show age",
    "settings.showBio": "Show bio",
    "settings.showUniversity": "Show university",
    "settings.logoutConfirm": "Do you want to log out of your account?",
    "settings.privacyHint": "Privacy settings are stored locally. Full support will be available soon.",
    "settings.helpTitle": "Help",
    "settings.faq": "FAQ",
    "settings.contact": "Contact",
    "settings.feedback": "Feedback",
    "settings.mailUnavailable": "Mail is unavailable",
    "settings.mailUnavailableBody": "Mail is often not configured in the simulator. Write to {email}.",
    "settings.reportBug": "Report a bug",
    "settings.reportBugDesc": "Help us improve the app",
    "settings.suggestFeature": "Suggest a feature",
    "settings.suggestFeatureDesc": "Tell us what you want",
    "settings.termsTitle": "Terms of use",
    "settings.lastUpdated": "Last updated: April 2026",

    "faq.whatTitle": "What is Boni Buddy?",
    "faq.whatBody": "Boni Buddy helps students find company for student boni. Swipe profiles, match and go for boni together!",
    "faq.boniTitle": "How do boni work?",
    "faq.boniBody": "Post a bon with a location or part of town and a time. Other students can join. You can post it publicly (everyone sees it) or privately (only your buddies).",
    "faq.buddyTitle": "How do I get a buddy?",
    "faq.buddyBody": "In the Discover tab, swipe right on profiles you like. If both of you swipe right, you become buddies and can chat.",
    "faq.emailTitle": "Do I need a student email?",
    "faq.emailBody": "Not for now, but we plan to require student email verification in the future.",
    "faq.deleteTitle": "How do I delete my account?",
    "faq.deleteBody": "Go to Profile > Privacy > Delete account. Your data will be permanently removed.",
    "faq.reportTitle": "How do I report inappropriate content?",
    "faq.reportBody": "Email us at {email} with a description of the situation. We take every report seriously.",
    "faq.freeTitle": "Is the app free?",
    "faq.freeBody": "Yes! Boni Buddy is completely free for all students.",

    "terms.generalTitle": "1. General",
    "terms.generalBody": "Boni Buddy is a mobile app for connecting students who use student boni. By using the app, you agree to these terms.",
    "terms.accountTitle": "2. User account",
    "terms.accountBody": "You need a valid student email address to use the app. You are responsible for keeping your account secure and for all activity under it.",
    "terms.contentTitle": "3. Content",
    "terms.contentBody": "Users are responsible for the content they post. Offensive, discriminatory or illegal content is not allowed.",
    "terms.privacyTitle": "4. Privacy",
    "terms.privacyBody": "We process your personal data in line with GDPR. Details are available in our privacy policy.",
    "terms.liabilityTitle": "5. Limitation of liability",
    "terms.liabilityBody": "Boni Buddy is not responsible for interactions between users outside the app or for any damages arising from use.",
    "terms.changesTitle": "6. Changes to terms",
    "terms.changesBody": "We reserve the right to change these terms. We will notify users about major changes through the app.",
  },
} as const;

export type TranslationKey = keyof typeof translations.sl;

function isLanguage(value: unknown): value is Language {
  return value === "sl" || value === "en";
}

function translate(language: Language, key: TranslationKey, params?: Params) {
  let value = translations[language][key] ?? translations.sl[key] ?? key;
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] === undefined ? `{${name}}` : String(params[name])
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function syncProfileLanguage(userId: string) {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("preferred_language")
          .eq("user_id", userId)
          .maybeSingle();

        const profileLanguage = (data as { preferred_language?: unknown } | null)
          ?.preferred_language;
        if (!cancelled && isLanguage(profileLanguage)) {
          setLanguageState(profileLanguage);
          await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, profileLanguage);
        }
      } catch {
        // Profile language is best-effort; local state remains authoritative.
      }
    }

    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (!cancelled && isLanguage(stored)) {
          setLanguageState(stored);
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        await syncProfileLanguage(user.id);
      } catch {
        // Keep Slovenian/default or locally stored language if profile sync fails.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        void syncProfileLanguage(session.user.id);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const setLanguage = useCallback(async (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ preferred_language: nextLanguage })
        .eq("user_id", user.id);
    } catch {
      // Local language is already saved; profile sync can be retried later.
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      ready,
      setLanguage,
      t: (key, params) => translate(language, key, params),
    }),
    [language, ready, setLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}

export function getEducationLevelLabel(
  educationLevel: string | null,
  t: (key: TranslationKey, params?: Params) => string
) {
  if (educationLevel === "dodiplomski") return t("onboarding.eduUndergrad");
  if (educationLevel === "magistrski") return t("onboarding.eduMasters");
  if (educationLevel === "doktorski") return t("onboarding.eduDoctoral");
  return educationLevel ?? "";
}

export function getGenderLabel(
  gender: string,
  t: (key: TranslationKey, params?: Params) => string
) {
  if (gender === "moški") return t("onboarding.genderMale");
  if (gender === "ženska") return t("onboarding.genderFemale");
  if (gender === "drugo") return t("onboarding.genderOther");
  return gender;
}

export const WEEKDAYS: Record<Language, string[]> = {
  sl: ["Ned", "Pon", "Tor", "Sre", "Čet", "Pet", "Sob"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};
