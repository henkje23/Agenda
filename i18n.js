(() => {
  const translations = {
    en: {
      Agenda: "Calendar",
      Functies: "Features",
      "Mijn profiel": "My profile",
      "Mijn agenda": "My calendar",
      "Nationale feestdagen worden automatisch berekend. Schoolvakanties zijn opgenomen voor schooljaar 2026-2027.":
        "Public holidays are calculated automatically. School holidays are included for the 2026–2027 school year.",
      "Nationale feestdagen worden automatisch berekend. Schoolvakanties zijn uitgeschakeld.":
        "Public holidays are calculated automatically. School holidays are turned off.",
      "Terug naar agenda": "Back to calendar",
      "Terug naar de agenda": "Back to calendar",
      Maandag: "Monday",
      Dinsdag: "Tuesday",
      Woensdag: "Wednesday",
      Donderdag: "Thursday",
      Vrijdag: "Friday",
      Zaterdag: "Saturday",
      Zondag: "Sunday",
      Notities: "Notes",
      "Mijn notities": "My notes",
      Todo: "Tasks",
      "Mijn taken": "My tasks",
      "Mijn links": "My links",
      "Dagen van de week": "Days of the week",
      Navigatie: "Navigation",
      "Naar profiel": "Go to profile",
      "Mijn profiel laden...": "Loading your profile...",
      "Je profiel laden...": "Loading your profile...",
      "Je profiel kon niet worden gestart.": "Your profile could not be started.",
      "Je accountgegevens.": "Your account details.",
      Account: "Account",
      "Ingelogd als": "Signed in as",
      "Land en regio": "Country and region",
      "Deze keuze bepaalt welke feestdagen en schoolvakanties in je agenda staan.":
        "This setting determines which public holidays and school breaks appear in your calendar.",
      Land: "Country",
      "Regio voor schoolvakanties": "Region for school holidays",
      "Land en regio opslaan": "Save country and region",
      Taal: "Language",
      "Taal opslaan": "Save language",
      "Taal opslaan...": "Saving language...",
      "Taal opgeslagen.": "Language saved.",
      "De taalvoorkeur opslaan is mislukt:": "Could not save language preference:",
      "Je taal bepaalt de taal van de hele agenda.": "Your language setting applies to the whole calendar.",
      Nederlands: "Dutch",
      Engels: "English",
      Frans: "French",
      Duits: "German",
      België: "Belgium",
      Nederland: "The Netherlands",
      Vlaanderen: "Flanders",
      "Wallonië en Franstalig Brussel": "Wallonia and French-speaking Brussels",
      "Duitstalige Gemeenschap": "German-speaking Community",
      "Noord-Nederland": "Northern Netherlands",
      "Midden-Nederland": "Central Netherlands",
      "Zuid-Nederland": "Southern Netherlands",
      "Land en regio opslaan...": "Saving country and region...",
      "Land en regio opgeslagen. De agenda gebruikt deze keuze voor de feestdagen.":
        "Country and region saved. Your calendar will use this setting for holidays.",
      "Land en regio opslaan is mislukt:": "Could not save country and region:",
      "Schoolvakanties uitschakelen": "Turn off school holidays",
      "Schoolvakanties inschakelen": "Turn on school holidays",
      "Instellingen opslaan...": "Saving settings...",
      "Schoolvakanties ingeschakeld.": "School holidays enabled.",
      "Schoolvakanties uitgeschakeld.": "School holidays disabled.",
      "Schoolvakanties wijzigen is mislukt:": "Could not change school holidays:",
      "Wachtwoord herstellen": "Reset password",
      Wachtwoord: "Password",
      "Maak een herstelcode en bewaar die veilig. Zonder e-mail kun je alleen met die code een nieuw wachtwoord instellen.":
        "Create a recovery code and keep it safe. You can only reset your password with this code.",
      "Herstelcode maken/vervangen": "Create/replace recovery code",
      "Agenda exporteren": "Export calendar",
      "Download je volledige agenda als .ics-bestand om die bijvoorbeeld in Google Agenda te importeren.":
        "Download your full calendar as an .ics file to import it into apps such as Google Calendar.",
      "Agenda exporteren (.ics)": "Export calendar (.ics)",
      "Agenda importeren": "Import calendar",
      "Voeg afspraken uit een .ics-bestand of een agenda-URL toe aan je agenda. Bij bijwerken blijven je eigen afspraken staan; afspraken die uit de feed zijn verwijderd, worden ook uit je agenda gehaald.":
        "Add events from an .ics file or calendar URL to your calendar. When syncing, your own events stay; events removed from the feed are also removed from your calendar.",
      "Kies een .ics-bestand": "Choose an .ics file",
      "Of plak een agenda-URL (.ics)": "Or paste a calendar URL (.ics)",
      "Smartschool-links worden rechtstreeks opgehaald. Andere links moeten openbaar zijn en CORS toestaan.":
        "Smartschool links are fetched directly. Other links must be public and allow CORS.",
      "Vul een .ics-bestand of een URL in, niet allebei.":
        "Choose an .ics file or enter a URL, not both.",
      "Vul een geldige agenda-URL in.": "Enter a valid calendar URL.",
      "Gebruik een openbare https://-URL zonder gebruikersnaam of wachtwoord.":
        "Use a public https:// URL without a username or password.",
      "De URL reageerde niet binnen 20 seconden.":
        "The URL did not respond within 20 seconds.",
      "De URL kon niet worden opgehaald. Controleer of de link openbaar is en CORS-toegang toestaat.":
        "Could not fetch the URL. Check that the link is public and allows CORS access.",
      "De URL heeft geen agenda-inhoud teruggestuurd.":
        "The URL did not return calendar content.",
      "Smartschool-agenda ophalen is mislukt:":
        "Could not fetch the Smartschool calendar:",
      "Smartschool heeft geen geldige agenda-inhoud teruggestuurd.":
        "Smartschool did not return valid calendar content.",
      "Smartschool heeft geen iCalendar-bestand teruggestuurd. Controleer of de link nog geldig is.":
        "Smartschool did not return an iCalendar file. Check whether the link is still valid.",
      "Dit is geen geldige Smartschool-agenda-URL.":
        "This is not a valid Smartschool calendar URL.",
      "Smartschool stuurde de agenda door naar een andere URL. Gebruik de actuele agenda-link.":
        "Smartschool redirected the calendar to another URL. Use the current calendar link.",
      "Smartschool reageerde niet binnen 20 seconden.":
        "Smartschool did not respond within 20 seconds.",
      "De Smartschool-agenda kon niet worden opgehaald.":
        "Could not fetch the Smartschool calendar.",
      "De Smartschool-agenda kon niet volledig worden gelezen.":
        "Could not read the complete Smartschool calendar.",
      "De Smartschool-agenda is leeg of groter dan 5 MB.":
        "The Smartschool calendar is empty or larger than 5 MB.",
      "De Smartschool-agenda is groter dan 5 MB.":
        "The Smartschool calendar is larger than 5 MB.",
      "Smartschool gaf HTTP ":
        "Smartschool returned HTTP ",
      "Agenda importeren (.ics)": "Import calendar (.ics)",
      "Agenda bijwerken": "Update calendar",
      "Agenda bijgewerkt:": "Calendar updated:",
      "nieuwe of gewijzigde afspraken,": "new or updated events,",
      "bestaande afspraken gekoppeld,": "existing events matched,",
      "verwijderde afspraken opgeruimd en": "removed events cleaned up and",
      "niet-ondersteunde afspraken overgeslagen.":
        "unsupported events skipped.",
      "De URL kon niet worden bewaard; plak hem volgende keer opnieuw.":
        "The URL could not be saved; paste it again next time.",
      "Kies een .ics-bestand of plak een agenda-URL.":
        "Choose an .ics file or paste a calendar URL.",
      "Agenda importeren...": "Importing calendar...",
      "Dit .ics-bestand is groter dan 5 MB. Kies een kleiner bestand.":
        "This .ics file is larger than 5 MB. Choose a smaller file.",
      "Geen importeerbare afspraken gevonden. Terugkerende, ongeldige of meerdaagse afspraken met tijden zijn overgeslagen.":
        "No importable events found. Recurring, invalid, or timed multi-day events were skipped.",
      "Importeren is gelukt:": "Import complete:",
      "afspraken toegevoegd,": "events added,",
      "afspraken overgeslagen (terugkerend of niet ondersteund).":
        "events skipped (recurring or unsupported).",
      "Agenda importeren is mislukt:": "Calendar import failed:",
      "Agenda laden...": "Loading calendar...",
      "Verbinding maken met de agenda...": "Connecting to the calendar...",
      "Je planning laden...": "Loading your schedule...",
      "Je planning is geladen.": "Your schedule is loaded.",
      "Je weekplanning is geladen en per dag op begintijd gesorteerd.":
        "Your weekly schedule is loaded and sorted by start time.",
      "Geen planning gevonden voor deze week.": "No events found for this week.",
      "De agenda kon niet worden geladen.": "The calendar could not be loaded.",
      "Herhaal nieuw wachtwoord": "Confirm new password",
      Uitloggen: "Sign out",
      "Profielfoto kiezen": "Choose profile picture",
      "Kies een afbeelding van maximaal 5 MB. Je profielfoto is openbaar zichtbaar bij je agenda.":
        "Choose an image up to 5 MB. Your profile picture is public and visible next to your calendar.",
      "Herstelcode kwijt?": "Lost your recovery code?",
      "Stuur mij een e-mail": "Email me",
      "dan kan hij je helpen met een nieuwe code.": "and I can help you get a new code.",
      "Wachtwoord herstellen met herstelcode": "Reset password with recovery code",
      "Vul het e-mailadres van je account, je bewaarde herstelcode en een nieuw wachtwoord in.":
        "Enter your account email, saved recovery code, and a new password.",
      "E-mailadres": "Email address",
      Herstelcode: "Recovery code",
      "Nieuw wachtwoord": "New password",
      "Wachtwoord herstellen...": "Resetting password...",
      "Wachtwoord herstellen is niet gelukt:": "Could not reset password:",
      "De nieuwe wachtwoorden zijn niet hetzelfde.": "The new passwords do not match.",
      "Wachtwoord herstellen is gelukt.": "Password reset successful.",
      "Je wachtwoord is hersteld. Je kunt nu inloggen.": "Your password has been reset. You can now sign in.",
      "Je bent niet ingelogd.": "You are not signed in.",
      "Je bent ingelogd.": "You are signed in.",
      "Wachtwoord opslaan": "Save password",
      "Wachtwoord is gewijzigd. Je bent nu ingelogd.": "Your password has been changed. You are now signed in.",
      "De herstel-link is ongeldig:": "The recovery link is invalid:",
      "Deze herstel-link is verlopen of al gebruikt. Vraag een nieuwe resetmail aan.":
        "This recovery link has expired or was already used. Request a new reset email.",
      "Herstelcode maken is niet gelukt:": "Could not create recovery code:",
      "Bewaar deze code nu. Hij wordt niet opnieuw getoond:": "Save this code now. It will not be shown again:",
      "Herstelcode gemaakt. Bewaar hem veilig; de vorige code werkt niet meer.":
        "Recovery code created. Keep it safe; the previous code no longer works.",
      "Je agenda laden voor export...": "Loading your calendar for export...",
      "Je hebt nog geen afspraken of feestdagen om te exporteren.":
        "There are no events or holidays to export.",
      "Geen afspraken of feestdagen om te exporteren.": "There are no events or holidays to export.",
      "Je agenda kon niet worden klaargezet voor export:": "Could not prepare your calendar for export:",
      "Feestdag": "Public holiday",
      Schoolvakantie: "School holiday",
      "Nieuwjaar": "New Year's Day",
      Nieuwjaarsdag: "New Year's Day",
      Paasmaandag: "Easter Monday",
      "Dag van de Arbeid": "Labour Day",
      Hemelvaart: "Ascension Day",
      Pinkstermaandag: "Whit Monday",
      "Nationale feestdag": "National Day",
      "Onze-Lieve-Vrouw Hemelvaart": "Assumption Day",
      Allerheiligen: "All Saints' Day",
      Wapenstilstand: "Armistice Day",
      Kerstmis: "Christmas Day",
      "Goede Vrijdag": "Good Friday",
      "Eerste paasdag": "Easter Sunday",
      "Tweede paasdag": "Easter Monday",
      Koningsdag: "King's Day",
      Bevrijdingsdag: "Liberation Day",
      Hemelvaartsdag: "Ascension Day",
      "Eerste pinksterdag": "Whit Sunday",
      "Tweede pinksterdag": "Whit Monday",
      "Eerste kerstdag": "Christmas Day",
      "Tweede kerstdag": "Boxing Day",
      Herfstvakantie: "Autumn break",
      Kerstvakantie: "Christmas break",
      Krokusvakantie: "Carnival break",
      Paasvakantie: "Easter break",
      Lentevakantie: "Spring break",
      Zomervakantie: "Summer break",
      Voorjaarsvakantie: "Spring break",
      Meivakantie: "May break",
      "Hele dag": "All day",
      "Zoeken": "Search",
      Categorie: "Category",
      "Alle categorieën": "All categories",
      "Zoek in afspraken": "Search events",
      "Vorige week": "Previous week",
      "Volgende week": "Next week",
      Vandaag: "Today",
      "Maandoverzicht": "Month view",
      "Weekoverzicht": "Week view",
      "Mijn planning": "My schedule",
      "Afspraak toevoegen": "Add event",
      "Afspraak bewerken": "Edit event",
      "Afspraak opslaan...": "Saving event...",
      "Opslaan is niet gelukt:": "Could not save:",
      "Afspraak opgeslagen.": "Event saved.",
      "Afspraak bijgewerkt.": "Event updated.",
      "Afspraak verwijderd.": "Event deleted.",
      "Verwijderen": "Delete",
      Bewerken: "Edit",
      Activiteit: "Event",
      Herhaling: "Repeat",
      "Datum van herhaling": "Repeat date",
      "Eerste datum van herhaling": "First repeat date",
      "Elke week op geselecteerde dagen": "Every week on selected days",
      "Elke dag": "Every day",
      "Elke maand op dezelfde dag van de maand": "Every month on the same day",
      "Elk jaar op dezelfde dag en maand": "Every year on the same day and month",
      "Alleen deze week": "This week only",
      Begintijd: "Start time",
      Eindtijd: "End time",
      Kleur: "Color",
      Standaard: "Default",
      "Geen categorie": "No category",
      School: "School",
      Werk: "Work",
      Sport: "Sports",
      Thuis: "Home",
      Overig: "Other",
      "Kies minstens één dag voor de herhaling.": "Choose at least one repeat day.",
      "Kies de datum waarop de herhaling begint.": "Choose the date when repetition starts.",
      "Je agenda kon niet worden geladen:": "Could not load your calendar:",
      "De database mist een herhalingskolom. Voer de SQL uit supabase-setup.sql uit.":
        "A recurrence column is missing from the database. Run supabase-setup.sql.",
      "Voor herhaling op meerdere weekdagen moet je eerst de SQL voor repeat_days uitvoeren.":
        "To repeat on multiple weekdays, first run the SQL for repeat_days.",
      "Geen afspraken gevonden met deze zoekopdracht of categorie.":
        "No events match this search or category.",
      "Zoek naar een activiteit": "Search for an event",
      "Eindtijd moet na de begintijd liggen.": "The end time must be after the start time.",
      "De eindtijd moet na de begintijd liggen.": "The end time must be after the start time.",
      "Log in of maak een account aan om je planning te zien.":
        "Sign in or create an account to see your schedule.",
      "Log in of maak een account aan om je eigen planning te beheren.":
        "Sign in or create an account to manage your schedule.",
      Inloggen: "Sign in",
      "Account aanmaken": "Create account",
      "Log eerst in om afspraken op te slaan.": "Sign in first to save events.",
      "Vul een naam voor de activiteit in.": "Enter a name for the event.",
      "Je agenda kon niet worden geladen.": "Could not load your calendar.",
      "Agenda geladen.": "Calendar loaded.",
      "Notities - Agenda": "Notes - Calendar",
      "Links - Agenda": "Links - Calendar",
      "Todo - agenda": "Tasks - Calendar",
      "Nieuwe link": "New link",
      "Link opslaan": "Save link",
      "Link bijgewerkt.": "Link updated.",
      "Link opgeslagen.": "Link saved.",
      "Link verwijderd.": "Link deleted.",
      "Link bewerken": "Edit link",
      "Wijzigingen opslaan": "Save changes",
      "Geef je link een naam.": "Give your link a name.",
      "Vul een geldige volledige link in.": "Enter a valid full URL.",
      "Gebruik een link die begint met http:// of https://.": "Use a URL starting with http:// or https://.",
      "Link opslaan is mislukt:": "Could not save link:",
      "Links konden niet worden geladen:": "Could not load links:",
      "Je links zijn geladen.": "Your links are loaded.",
      "Ga naar de agenda om in te loggen": "Go to the calendar to sign in",
      "Nieuwe notitie": "New note",
      "Notitie opslaan": "Save note",
      "Notitie bijwerken": "Update note",
      "Notitie verwijderen": "Delete note",
      "Notitie opgeslagen.": "Note saved.",
      "Notitie bijgewerkt.": "Note updated.",
      "Notitie verwijderd.": "Note deleted.",
      "Geef je notitie een titel": "Give your note a title",
      "Schrijf hier je notitie.": "Write your note here.",
      "Jouw agenda": "Your calendar",
      "Log in om je taken te beheren.": "Sign in to manage your tasks.",
      "Je taken worden privé bij je account opgeslagen.":
        "Your tasks are saved privately to your account.",
      "Log in om je notities te bekijken.": "Sign in to view your notes.",
      "Log in om je links te bekijken.": "Sign in to view your links.",
      "Gebruik hetzelfde account als voor je agenda.":
        "Use the same account as your calendar.",
      "Log in via je agenda-account om je taken te bekijken.":
        "Sign in with your calendar account to view your tasks.",
      "Log in via je agenda-account om je notities te bekijken.":
        "Sign in with your calendar account to view your notes.",
      "Log in via je agenda-account om je links te bekijken.":
        "Sign in with your calendar account to view your links.",
      "Bewaar ideeën en belangrijke informatie.": "Save ideas and important information.",
      "Je notities zijn alleen zichtbaar": "Your notes are only visible",
      "Je links zijn alleen zichtbaar": "Your links are only visible",
      "Je links zijn alleen zichtbaar voor": "Your links are only visible to",
      "jouw account.": "you.",
      "voor jouw account.": "to you.",
      "Bewaar handige websites op één plek.": "Keep useful websites in one place.",
      "Maak je eigen takenlijst en houd bij wat al klaar is.":
        "Create your own task list and track what is done.",
      "Taak toevoegen": "Add task",
      "Taak opslaan": "Save task",
      "Nieuwe taak": "New task",
      "Taak bewerken": "Edit task",
      "Taak bijgewerkt.": "Task updated.",
      "Taak opgeslagen.": "Task saved.",
      "Taak verwijderd.": "Task deleted.",
      "Alle taken": "All tasks",
      Open: "Open",
      Afgerond: "Completed",
      "Bijvoorbeeld: huiswerk maken": "For example: do homework",
      "Geen taken gevonden.": "No tasks found.",
      "Links": "Links",
      "Feestdagen worden automatisch berekend.": "Public holidays are calculated automatically.",
    },
    fr: {
      Agenda: "Agenda",
      Functies: "Fonctionnalités",
      "Mijn profiel": "Mon profil",
      "Mijn agenda": "Mon agenda",
      "Nationale feestdagen worden automatisch berekend. Schoolvakanties zijn opgenomen voor schooljaar 2026-2027.":
        "Les jours fériés sont calculés automatiquement. Les vacances scolaires sont incluses pour l'année scolaire 2026-2027.",
      "Nationale feestdagen worden automatisch berekend. Schoolvakanties zijn uitgeschakeld.":
        "Les jours fériés sont calculés automatiquement. Les vacances scolaires sont désactivées.",
      "Terug naar agenda": "Retour à l'agenda",
      "Terug naar de agenda": "Retour à l'agenda",
      Maandag: "Lundi",
      Dinsdag: "Mardi",
      Woensdag: "Mercredi",
      Donderdag: "Jeudi",
      Vrijdag: "Vendredi",
      Zaterdag: "Samedi",
      Zondag: "Dimanche",
      Notities: "Notes",
      "Mijn notities": "Mes notes",
      Todo: "Tâches",
      "Mijn taken": "Mes tâches",
      "Mijn links": "Mes liens",
      "Dagen van de week": "Jours de la semaine",
      Navigatie: "Navigation",
      "Naar profiel": "Aller au profil",
      "Mijn profiel laden...": "Chargement de votre profil...",
      "Je profiel laden...": "Chargement de votre profil...",
      "Je accountgegevens.": "Informations de votre compte.",
      Account: "Compte",
      "Ingelogd als": "Connecté en tant que",
      "Land en regio": "Pays et région",
      "Deze keuze bepaalt welke feestdagen en schoolvakanties in je agenda staan.":
        "Ce choix détermine les jours fériés et vacances scolaires affichés dans votre agenda.",
      Land: "Pays",
      "Regio voor schoolvakanties": "Région pour les vacances scolaires",
      "Land en regio opslaan": "Enregistrer le pays et la région",
      Taal: "Langue",
      "Taal opslaan": "Enregistrer la langue",
      "Taal opslaan...": "Enregistrement de la langue...",
      "Taal opgeslagen.": "Langue enregistrée.",
      "De taalvoorkeur opslaan is mislukt:": "Impossible d'enregistrer la langue :",
      "Je taal bepaalt de taal van de hele agenda.": "Votre langue s'applique à tout l'agenda.",
      Nederlands: "Néerlandais",
      Engels: "Anglais",
      Frans: "Français",
      Duits: "Allemand",
      België: "Belgique",
      Nederland: "Pays-Bas",
      Vlaanderen: "Flandre",
      "Wallonië en Franstalig Brussel": "Wallonie et Bruxelles francophone",
      "Duitstalige Gemeenschap": "Communauté germanophone",
      "Noord-Nederland": "Pays-Bas du Nord",
      "Midden-Nederland": "Pays-Bas centraux",
      "Zuid-Nederland": "Pays-Bas du Sud",
      "Land en regio opslaan...": "Enregistrement du pays et de la région...",
      "Land en regio opgeslagen. De agenda gebruikt deze keuze voor de feestdagen.":
        "Pays et région enregistrés. L'agenda utilisera ce choix pour les jours fériés.",
      "Schoolvakanties uitschakelen": "Désactiver les vacances scolaires",
      "Schoolvakanties inschakelen": "Activer les vacances scolaires",
      "Instellingen opslaan...": "Enregistrement des paramètres...",
      "Schoolvakanties ingeschakeld.": "Vacances scolaires activées.",
      "Schoolvakanties uitgeschakeld.": "Vacances scolaires désactivées.",
      "Schoolvakanties wijzigen is mislukt:": "Impossible de modifier les vacances scolaires :",
      "Wachtwoord herstellen": "Réinitialiser le mot de passe",
      Wachtwoord: "Mot de passe",
      "Maak een herstelcode en bewaar die veilig. Zonder e-mail kun je alleen met die code een nieuw wachtwoord instellen.":
        "Créez un code de récupération et conservez-le en lieu sûr. Vous ne pouvez réinitialiser votre mot de passe qu'avec ce code.",
      "Herstelcode maken/vervangen": "Créer/remplacer le code de récupération",
      "Agenda exporteren": "Exporter l'agenda",
      "Agenda exporteren (.ics)": "Exporter l'agenda (.ics)",
      "Agenda importeren": "Importer l'agenda",
      "Voeg afspraken uit een .ics-bestand of een agenda-URL toe aan je agenda. Bij bijwerken blijven je eigen afspraken staan; afspraken die uit de feed zijn verwijderd, worden ook uit je agenda gehaald.":
        "Ajoutez des événements à votre agenda depuis un fichier .ics ou une URL. Lors de la mise à jour, vos propres événements sont conservés ; ceux supprimés du flux le sont aussi de votre agenda.",
      "Kies een .ics-bestand": "Choisir un fichier .ics",
      "Of plak een agenda-URL (.ics)": "Ou coller une URL d'agenda (.ics)",
      "Smartschool-links worden rechtstreeks opgehaald. Andere links moeten openbaar zijn en CORS toestaan.":
        "Les liens Smartschool sont récupérés directement. Les autres liens doivent être publics et autoriser CORS.",
      "Vul een .ics-bestand of een URL in, niet allebei.":
        "Choisissez un fichier .ics ou saisissez une URL, pas les deux.",
      "Vul een geldige agenda-URL in.": "Saisissez une URL d'agenda valide.",
      "Gebruik een openbare https://-URL zonder gebruikersnaam of wachtwoord.":
        "Utilisez une URL https:// publique sans nom d'utilisateur ni mot de passe.",
      "De URL reageerde niet binnen 20 seconden.":
        "L'URL n'a pas répondu en 20 secondes.",
      "De URL kon niet worden opgehaald. Controleer of de link openbaar is en CORS-toegang toestaat.":
        "Impossible de récupérer l'URL. Vérifiez que le lien est public et autorise CORS.",
      "De URL heeft geen agenda-inhoud teruggestuurd.":
        "L'URL n'a renvoyé aucun contenu d'agenda.",
      "Smartschool-agenda ophalen is mislukt:":
        "Impossible de récupérer l'agenda Smartschool :",
      "Smartschool heeft geen geldige agenda-inhoud teruggestuurd.":
        "Smartschool n'a pas renvoyé de contenu d'agenda valide.",
      "Smartschool heeft geen iCalendar-bestand teruggestuurd. Controleer of de link nog geldig is.":
        "Smartschool n'a pas renvoyé de fichier iCalendar. Vérifiez si le lien est toujours valide.",
      "Dit is geen geldige Smartschool-agenda-URL.":
        "Cette URL d'agenda Smartschool n'est pas valide.",
      "Smartschool stuurde de agenda door naar een andere URL. Gebruik de actuele agenda-link.":
        "Smartschool a redirigé l'agenda vers une autre URL. Utilisez le lien d'agenda actuel.",
      "Smartschool reageerde niet binnen 20 seconden.":
        "Smartschool n'a pas répondu en 20 secondes.",
      "De Smartschool-agenda kon niet worden opgehaald.":
        "Impossible de récupérer l'agenda Smartschool.",
      "De Smartschool-agenda kon niet volledig worden gelezen.":
        "Impossible de lire l'intégralité de l'agenda Smartschool.",
      "De Smartschool-agenda is leeg of groter dan 5 MB.":
        "L'agenda Smartschool est vide ou dépasse 5 Mo.",
      "De Smartschool-agenda is groter dan 5 MB.":
        "L'agenda Smartschool dépasse 5 Mo.",
      "Smartschool gaf HTTP ": "Smartschool a renvoyé HTTP ",
      "Agenda importeren (.ics)": "Importer l'agenda (.ics)",
      "Agenda bijwerken": "Mettre à jour l'agenda",
      "Agenda bijgewerkt:": "Agenda mise à jour :",
      "nieuwe of gewijzigde afspraken,": "nouveaux événements ou événements modifiés,",
      "bestaande afspraken gekoppeld,": "événements existants associés,",
      "verwijderde afspraken opgeruimd en": "événements supprimés retirés et",
      "niet-ondersteunde afspraken overgeslagen.":
        "événements non pris en charge ignorés.",
      "De URL kon niet worden bewaard; plak hem volgende keer opnieuw.":
        "L'URL n'a pas pu être enregistrée ; collez-la à nouveau la prochaine fois.",
      "Kies een .ics-bestand of plak een agenda-URL.":
        "Choisissez un fichier .ics ou collez une URL d'agenda.",
      "Agenda importeren...": "Importation de l'agenda...",
      "Dit .ics-bestand is groter dan 5 MB. Kies een kleiner bestand.":
        "Ce fichier .ics dépasse 5 Mo. Choisissez un fichier plus petit.",
      "Geen importeerbare afspraken gevonden. Terugkerende, ongeldige of meerdaagse afspraken met tijden zijn overgeslagen.":
        "Aucun événement importable trouvé. Les événements récurrents, invalides ou sur plusieurs jours avec horaires ont été ignorés.",
      "Importeren is gelukt:": "Importation terminée :",
      "afspraken toegevoegd,": "événements ajoutés,",
      "afspraken overgeslagen (terugkerend of niet ondersteund).":
        "événements ignorés (récurrents ou non pris en charge).",
      "Agenda importeren is mislukt:": "Échec de l'importation de l'agenda :",
      "Agenda laden...": "Chargement de l'agenda...",
      Uitloggen: "Se déconnecter",
      "Profielfoto kiezen": "Choisir une photo de profil",
      "E-mailadres": "Adresse e-mail",
      Herstelcode: "Code de récupération",
      "Nieuw wachtwoord": "Nouveau mot de passe",
      "Herhaal nieuw wachtwoord": "Confirmer le nouveau mot de passe",
      "De nieuwe wachtwoorden zijn niet hetzelfde.": "Les nouveaux mots de passe ne correspondent pas.",
      "Vorige week": "Semaine précédente",
      "Volgende week": "Semaine suivante",
      Vandaag: "Aujourd'hui",
      "Maandoverzicht": "Vue mensuelle",
      "Weekoverzicht": "Vue hebdomadaire",
      "Afspraak toevoegen": "Ajouter un événement",
      "Afspraak bewerken": "Modifier l'événement",
      Bewerken: "Modifier",
      Verwijderen: "Supprimer",
      Activiteit: "Événement",
      Herhaling: "Répétition",
      "Eerste datum van herhaling": "Première date de répétition",
      "Elke week op geselecteerde dagen": "Chaque semaine aux jours sélectionnés",
      "Elke dag": "Chaque jour",
      "Elke maand op dezelfde dag van de maand": "Chaque mois le même jour",
      "Elk jaar op dezelfde dag en maand": "Chaque année le même jour et mois",
      "Alleen deze week": "Cette semaine uniquement",
      Begintijd: "Heure de début",
      Eindtijd: "Heure de fin",
      Kleur: "Couleur",
      Categorie: "Catégorie",
      "Alle categorieën": "Toutes les catégories",
      "Zoeken": "Rechercher",
      "Hele dag": "Toute la journée",
      "Feestdag": "Jour férié",
      Schoolvakantie: "Vacances scolaires",
      Nieuwjaar: "Nouvel An",
      "Nationale feestdag": "Fête nationale",
      "Dag van de Arbeid": "Fête du Travail",
      Hemelvaart: "Ascension",
      Pinkstermaandag: "Lundi de Pentecôte",
      Kerstmis: "Noël",
      Herfstvakantie: "Vacances d'automne",
      Kerstvakantie: "Vacances de Noël",
      Krokusvakantie: "Vacances de carnaval",
      Paasvakantie: "Vacances de Pâques",
      Lentevakantie: "Vacances de printemps",
      Zomervakantie: "Vacances d'été",
      Voorjaarsvakantie: "Vacances de printemps",
      Meivakantie: "Vacances de mai",
      "Inloggen": "Se connecter",
      "Account aanmaken": "Créer un compte",
      "Log in of maak een account aan om je planning te zien.":
        "Connectez-vous ou créez un compte pour consulter votre planning.",
      "Log eerst in om afspraken op te slaan.": "Connectez-vous d'abord pour enregistrer des événements.",
      "Vul een naam voor de activiteit in.": "Saisissez le nom de l'événement.",
      "De eindtijd moet na de begintijd liggen.": "L'heure de fin doit être après l'heure de début.",
      "Nieuwe link": "Nouveau lien",
      "Link opslaan": "Enregistrer le lien",
      "Nieuwe notitie": "Nouvelle note",
      "Notitie opslaan": "Enregistrer la note",
      "Log in om je taken te beheren.": "Connectez-vous pour gérer vos tâches.",
      "Je taken worden privé bij je account opgeslagen.":
        "Vos tâches sont enregistrées en privé dans votre compte.",
      "Log in om je notities te bekijken.": "Connectez-vous pour consulter vos notes.",
      "Log in om je links te bekijken.": "Connectez-vous pour consulter vos liens.",
      "Gebruik hetzelfde account als voor je agenda.":
        "Utilisez le même compte que pour votre agenda.",
      "Log in via je agenda-account om je taken te bekijken.":
        "Connectez-vous avec votre compte d'agenda pour consulter vos tâches.",
      "Log in via je agenda-account om je notities te bekijken.":
        "Connectez-vous avec votre compte d'agenda pour consulter vos notes.",
      "Log in via je agenda-account om je links te bekijken.":
        "Connectez-vous avec votre compte d'agenda pour consulter vos liens.",
      "Bewaar ideeën en belangrijke informatie.": "Conservez vos idées et informations importantes.",
      "Je notities zijn alleen zichtbaar": "Vos notes ne sont visibles que",
      "Je links zijn alleen zichtbaar": "Vos liens ne sont visibles que",
      "Je links zijn alleen zichtbaar voor": "Vos liens ne sont visibles que pour",
      "jouw account.": "vous.",
      "voor jouw account.": "pour vous.",
      "Bewaar handige websites op één plek.": "Conservez vos sites utiles au même endroit.",
      "Taak toevoegen": "Ajouter une tâche",
      "Taak opslaan": "Enregistrer la tâche",
      "Ga naar de agenda om in te loggen": "Allez à l'agenda pour vous connecter",
    },
    de: {
      Agenda: "Kalender",
      Functies: "Funktionen",
      "Mijn profiel": "Mein Profil",
      "Mijn agenda": "Mein Kalender",
      "Nationale feestdagen worden automatisch berekend. Schoolvakanties zijn opgenomen voor schooljaar 2026-2027.":
        "Feiertage werden automatisch berechnet. Schulferien sind für das Schuljahr 2026–2027 enthalten.",
      "Nationale feestdagen worden automatisch berekend. Schoolvakanties zijn uitgeschakeld.":
        "Feiertage werden automatisch berechnet. Schulferien sind ausgeschaltet.",
      "Terug naar agenda": "Zurück zum Kalender",
      "Terug naar de agenda": "Zurück zum Kalender",
      Maandag: "Montag",
      Dinsdag: "Dienstag",
      Woensdag: "Mittwoch",
      Donderdag: "Donnerstag",
      Vrijdag: "Freitag",
      Zaterdag: "Samstag",
      Zondag: "Sonntag",
      Notities: "Notizen",
      "Mijn notities": "Meine Notizen",
      Todo: "Aufgaben",
      "Mijn taken": "Meine Aufgaben",
      "Mijn links": "Meine Links",
      "Dagen van de week": "Wochentage",
      Navigatie: "Navigation",
      "Naar profiel": "Zum Profil",
      "Mijn profiel laden...": "Profil wird geladen...",
      "Je profiel laden...": "Profil wird geladen...",
      "Je accountgegevens.": "Deine Kontodaten.",
      Account: "Konto",
      "Ingelogd als": "Angemeldet als",
      "Land en regio": "Land und Region",
      "Deze keuze bepaalt welke feestdagen en schoolvakanties in je agenda staan.":
        "Diese Auswahl bestimmt die Feiertage und Schulferien in deinem Kalender.",
      Land: "Land",
      "Regio voor schoolvakanties": "Region für Schulferien",
      "Land en regio opslaan": "Land und Region speichern",
      Taal: "Sprache",
      "Taal opslaan": "Sprache speichern",
      "Taal opslaan...": "Sprache wird gespeichert...",
      "Taal opgeslagen.": "Sprache gespeichert.",
      "De taalvoorkeur opslaan is mislukt:": "Sprache konnte nicht gespeichert werden:",
      "Je taal bepaalt de taal van de hele agenda.": "Deine Spracheinstellung gilt für den gesamten Kalender.",
      Nederlands: "Niederländisch",
      Engels: "Englisch",
      Frans: "Französisch",
      Duits: "Deutsch",
      België: "Belgien",
      Nederland: "Niederlande",
      Vlaanderen: "Flandern",
      "Wallonië en Franstalig Brussel": "Wallonien und französischsprachiges Brüssel",
      "Duitstalige Gemeenschap": "Deutschsprachige Gemeinschaft",
      "Noord-Nederland": "Nordniederlande",
      "Midden-Nederland": "Mittelniederlande",
      "Zuid-Nederland": "Südniederlande",
      "Land en regio opslaan...": "Land und Region werden gespeichert...",
      "Land en regio opgeslagen. De agenda gebruikt deze keuze voor de feestdagen.":
        "Land und Region gespeichert. Dein Kalender verwendet diese Auswahl für Feiertage.",
      "Schoolvakanties uitschakelen": "Schulferien ausschalten",
      "Schoolvakanties inschakelen": "Schulferien einschalten",
      "Instellingen opslaan...": "Einstellungen werden gespeichert...",
      "Schoolvakanties ingeschakeld.": "Schulferien eingeschaltet.",
      "Schoolvakanties uitgeschakeld.": "Schulferien ausgeschaltet.",
      "Schoolvakanties wijzigen is mislukt:": "Schulferien konnten nicht geändert werden:",
      "Wachtwoord herstellen": "Passwort zurücksetzen",
      Wachtwoord: "Passwort",
      "Maak een herstelcode en bewaar die veilig. Zonder e-mail kun je alleen met die code een nieuw wachtwoord instellen.":
        "Erstelle einen Wiederherstellungscode und bewahre ihn sicher auf. Du kannst dein Passwort nur mit diesem Code zurücksetzen.",
      "Herstelcode maken/vervangen": "Wiederherstellungscode erstellen/ersetzen",
      "Agenda exporteren": "Kalender exportieren",
      "Agenda exporteren (.ics)": "Kalender exportieren (.ics)",
      "Agenda importeren": "Kalender importieren",
      "Voeg afspraken uit een .ics-bestand of een agenda-URL toe aan je agenda. Bij bijwerken blijven je eigen afspraken staan; afspraken die uit de feed zijn verwijderd, worden ook uit je agenda gehaald.":
        "Füge Termine aus einer .ics-Datei oder Kalender-URL hinzu. Bei der Aktualisierung bleiben deine eigenen Termine erhalten; aus dem Feed entfernte Termine werden auch aus deinem Kalender gelöscht.",
      "Kies een .ics-bestand": "Eine .ics-Datei auswählen",
      "Of plak een agenda-URL (.ics)": "Oder eine Kalender-URL (.ics) einfügen",
      "Smartschool-links worden rechtstreeks opgehaald. Andere links moeten openbaar zijn en CORS toestaan.":
        "Smartschool-Links werden direkt abgerufen. Andere Links müssen öffentlich sein und CORS zulassen.",
      "Vul een .ics-bestand of een URL in, niet allebei.":
        "Wähle eine .ics-Datei oder gib eine URL ein, nicht beides.",
      "Vul een geldige agenda-URL in.": "Gib eine gültige Kalender-URL ein.",
      "Gebruik een openbare https://-URL zonder gebruikersnaam of wachtwoord.":
        "Verwende eine öffentliche https://-URL ohne Benutzername oder Passwort.",
      "De URL reageerde niet binnen 20 seconden.":
        "Die URL hat innerhalb von 20 Sekunden nicht geantwortet.",
      "De URL kon niet worden opgehaald. Controleer of de link openbaar is en CORS-toegang toestaat.":
        "Die URL konnte nicht abgerufen werden. Prüfe, ob der Link öffentlich ist und CORS zulässt.",
      "De URL heeft geen agenda-inhoud teruggestuurd.":
        "Die URL hat keinen Kalenderinhalt zurückgegeben.",
      "Smartschool-agenda ophalen is mislukt:":
        "Smartschool-Kalender konnte nicht abgerufen werden:",
      "Smartschool heeft geen geldige agenda-inhoud teruggestuurd.":
        "Smartschool hat keinen gültigen Kalenderinhalt zurückgegeben.",
      "Smartschool heeft geen iCalendar-bestand teruggestuurd. Controleer of de link nog geldig is.":
        "Smartschool hat keine iCalendar-Datei zurückgegeben. Prüfe, ob der Link noch gültig ist.",
      "Dit is geen geldige Smartschool-agenda-URL.":
        "Dies ist keine gültige Smartschool-Kalender-URL.",
      "Smartschool stuurde de agenda door naar een andere URL. Gebruik de actuele agenda-link.":
        "Smartschool hat den Kalender auf eine andere URL umgeleitet. Verwende den aktuellen Kalenderlink.",
      "Smartschool reageerde niet binnen 20 seconden.":
        "Smartschool hat innerhalb von 20 Sekunden nicht geantwortet.",
      "De Smartschool-agenda kon niet worden opgehaald.":
        "Der Smartschool-Kalender konnte nicht abgerufen werden.",
      "De Smartschool-agenda kon niet volledig worden gelezen.":
        "Der Smartschool-Kalender konnte nicht vollständig gelesen werden.",
      "De Smartschool-agenda is leeg of groter dan 5 MB.":
        "Der Smartschool-Kalender ist leer oder größer als 5 MB.",
      "De Smartschool-agenda is groter dan 5 MB.":
        "Der Smartschool-Kalender ist größer als 5 MB.",
      "Smartschool gaf HTTP ": "Smartschool gab HTTP ",
      "Agenda importeren (.ics)": "Kalender importieren (.ics)",
      "Agenda bijwerken": "Kalender aktualisieren",
      "Agenda bijgewerkt:": "Kalender aktualisiert:",
      "nieuwe of gewijzigde afspraken,": "neue oder geänderte Termine,",
      "bestaande afspraken gekoppeld,": "vorhandene Termine zugeordnet,",
      "verwijderde afspraken opgeruimd en": "entfernte Termine gelöscht und",
      "niet-ondersteunde afspraken overgeslagen.":
        "nicht unterstützte Termine übersprungen.",
      "De URL kon niet worden bewaard; plak hem volgende keer opnieuw.":
        "Die URL konnte nicht gespeichert werden; füge sie beim nächsten Mal erneut ein.",
      "Kies een .ics-bestand of plak een agenda-URL.":
        "Wähle eine .ics-Datei oder füge eine Kalender-URL ein.",
      "Agenda importeren...": "Kalender wird importiert...",
      "Dit .ics-bestand is groter dan 5 MB. Kies een kleiner bestand.":
        "Diese .ics-Datei ist größer als 5 MB. Wähle eine kleinere Datei.",
      "Geen importeerbare afspraken gevonden. Terugkerende, ongeldige of meerdaagse afspraken met tijden zijn overgeslagen.":
        "Keine importierbaren Termine gefunden. Wiederkehrende, ungültige oder mehrtägige Termine mit Uhrzeit wurden übersprungen.",
      "Importeren is gelukt:": "Import abgeschlossen:",
      "afspraken toegevoegd,": "Termine hinzugefügt,",
      "afspraken overgeslagen (terugkerend of niet ondersteund).":
        "Termine übersprungen (wiederkehrend oder nicht unterstützt).",
      "Agenda importeren is mislukt:": "Kalenderimport fehlgeschlagen:",
      "Agenda laden...": "Kalender wird geladen...",
      Uitloggen: "Abmelden",
      "Profielfoto kiezen": "Profilbild auswählen",
      "E-mailadres": "E-Mail-Adresse",
      Herstelcode: "Wiederherstellungscode",
      "Nieuw wachtwoord": "Neues Passwort",
      "Herhaal nieuw wachtwoord": "Neues Passwort bestätigen",
      "De nieuwe wachtwoorden zijn niet hetzelfde.": "Die neuen Passwörter stimmen nicht überein.",
      "Vorige week": "Vorherige Woche",
      "Volgende week": "Nächste Woche",
      Vandaag: "Heute",
      "Maandoverzicht": "Monatsansicht",
      "Weekoverzicht": "Wochenansicht",
      "Afspraak toevoegen": "Termin hinzufügen",
      "Afspraak bewerken": "Termin bearbeiten",
      Bewerken: "Bearbeiten",
      Verwijderen: "Löschen",
      Activiteit: "Aktivität",
      Herhaling: "Wiederholung",
      "Eerste datum van herhaling": "Erstes Wiederholungsdatum",
      "Elke week op geselecteerde dagen": "Jede Woche an ausgewählten Tagen",
      "Elke dag": "Jeden Tag",
      "Elke maand op dezelfde dag van de maand": "Jeden Monat am selben Tag",
      "Elk jaar op dezelfde dag en maand": "Jedes Jahr am selben Tag und Monat",
      "Alleen deze week": "Nur diese Woche",
      Begintijd: "Startzeit",
      Eindtijd: "Endzeit",
      Kleur: "Farbe",
      Categorie: "Kategorie",
      "Alle categorieën": "Alle Kategorien",
      "Zoeken": "Suchen",
      "Hele dag": "Ganztägig",
      "Feestdag": "Feiertag",
      Schoolvakantie: "Schulferien",
      Nieuwjaar: "Neujahr",
      "Nationale feestdag": "Nationalfeiertag",
      "Dag van de Arbeid": "Tag der Arbeit",
      Hemelvaart: "Christi Himmelfahrt",
      Pinkstermaandag: "Pfingstmontag",
      Kerstmis: "Weihnachten",
      Herfstvakantie: "Herbstferien",
      Kerstvakantie: "Weihnachtsferien",
      Krokusvakantie: "Karnevalsferien",
      Paasvakantie: "Osterferien",
      Lentevakantie: "Frühlingsferien",
      Zomervakantie: "Sommerferien",
      Voorjaarsvakantie: "Frühlingsferien",
      Meivakantie: "Maiferien",
      Inloggen: "Anmelden",
      "Account aanmaken": "Konto erstellen",
      "Log in of maak een account aan om je planning te zien.":
        "Melde dich an oder erstelle ein Konto, um deinen Kalender zu sehen.",
      "Log eerst in om afspraken op te slaan.": "Melde dich zuerst an, um Termine zu speichern.",
      "Vul een naam voor de activiteit in.": "Gib einen Namen für die Aktivität ein.",
      "De eindtijd moet na de begintijd liggen.": "Die Endzeit muss nach der Startzeit liegen.",
      "Nieuwe link": "Neuer Link",
      "Link opslaan": "Link speichern",
      "Nieuwe notitie": "Neue Notiz",
      "Notitie opslaan": "Notiz speichern",
      "Log in om je taken te beheren.": "Melde dich an, um deine Aufgaben zu verwalten.",
      "Je taken worden privé bij je account opgeslagen.":
        "Deine Aufgaben werden privat in deinem Konto gespeichert.",
      "Log in om je notities te bekijken.": "Melde dich an, um deine Notizen anzusehen.",
      "Log in om je links te bekijken.": "Melde dich an, um deine Links anzusehen.",
      "Gebruik hetzelfde account als voor je agenda.":
        "Verwende dasselbe Konto wie für deinen Kalender.",
      "Log in via je agenda-account om je taken te bekijken.":
        "Melde dich mit deinem Kalenderkonto an, um deine Aufgaben anzusehen.",
      "Log in via je agenda-account om je notities te bekijken.":
        "Melde dich mit deinem Kalenderkonto an, um deine Notizen anzusehen.",
      "Log in via je agenda-account om je links te bekijken.":
        "Melde dich mit deinem Kalenderkonto an, um deine Links anzusehen.",
      "Bewaar ideeën en belangrijke informatie.": "Bewahre Ideen und wichtige Informationen auf.",
      "Je notities zijn alleen zichtbaar": "Deine Notizen sind nur",
      "Je links zijn alleen zichtbaar": "Deine Links sind nur",
      "Je links zijn alleen zichtbaar voor": "Deine Links sind nur für",
      "jouw account.": "dich sichtbar.",
      "voor jouw account.": "für dich sichtbar.",
      "Bewaar handige websites op één plek.": "Bewahre nützliche Webseiten an einem Ort auf.",
      "Taak toevoegen": "Aufgabe hinzufügen",
      "Taak opslaan": "Aufgabe speichern",
      "Ga naar de agenda om in te loggen": "Gehe zum Kalender, um dich anzumelden",
    },
  };

  const supportedLanguages = ["nl", "en", "fr", "de"];
  const getLanguage = () => {
    try {
      const savedLanguage = window.localStorage.getItem("agenda-language");
      return supportedLanguages.includes(savedLanguage) ? savedLanguage : "nl";
    } catch (error) {
      console.error("De voorkeurstaal kon niet worden gelezen.", error);
      return "nl";
    }
  };
  let language = getLanguage();
  const translatedNodes = new WeakMap();
  const translatedAttributes = new WeakMap();

  function translateText(value) {
    if (language === "nl") {
      return value;
    }
    const catalog = translations[language];
    if (catalog[value.trim()]) {
      const leading = value.match(/^\s*/)?.[0] || "";
      const trailing = value.match(/\s*$/)?.[0] || "";
      return `${leading}${catalog[value.trim()]}${trailing}`;
    }

    let translated = value;
    Object.entries(catalog)
      .sort(([first], [second]) => second.length - first.length)
      .forEach(([dutch, localized]) => {
        translated = translated.replaceAll(dutch, localized);
      });
    return translated;
  }

  function shouldSkipText(node) {
    return Boolean(
      node.parentElement?.closest(
        "script, style, textarea, .agenda-item-title, .todo-taak-tekst, .notitie-inhoud, .notitie-titel, .links-adres, #profiel-email",
      ),
    );
  }

  function translateNode(node, force = false) {
    if (shouldSkipText(node)) {
      return;
    }
    const currentText = node.nodeValue;
    const previous = translatedNodes.get(node);
    if (previous?.translated === currentText && !force) {
      return;
    }
    const sourceText =
      previous?.translated === currentText
        ? previous.source
        : currentText;
    const translated = translateText(sourceText);
    translatedNodes.set(node, { source: sourceText, translated });
    if (currentText !== translated) {
      node.nodeValue = translated;
    }
  }

  function translateAttributes(root) {
    const elements = [root, ...root.querySelectorAll("*")].filter(
      (element) => element instanceof Element,
    );
    elements.forEach((element) => {
      ["aria-label", "placeholder", "title"].forEach((attribute) => {
        const value = element.getAttribute(attribute);
        if (value) {
          const previous = translatedAttributes.get(element)?.[attribute];
          const source =
            previous?.translated === value ? previous.source : value;
          const translated = translateText(source);
          const attributes = translatedAttributes.get(element) || {};
          attributes[attribute] = { source, translated };
          translatedAttributes.set(element, attributes);
          if (value !== translated) {
            element.setAttribute(attribute, translated);
          }
        }
      });
    });
  }

  function translateDocument() {
    language = getLanguage();
    const locale = { nl: "nl", en: "en", fr: "fr", de: "de" }[language];
    document.documentElement.lang = locale;
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    let node = walker.nextNode();
    while (node) {
      translateNode(node, true);
      node = walker.nextNode();
    }
    translateAttributes(document.body);
    document.dispatchEvent(
      new CustomEvent("agenda-language-change", { detail: { language } }),
    );
  }

  function setLanguage(nextLanguage) {
    if (!supportedLanguages.includes(nextLanguage)) {
      throw new Error(`Unsupported language: ${nextLanguage}`);
    }
    window.localStorage.setItem("agenda-language", nextLanguage);
    language = nextLanguage;
    translateDocument();
  }

  window.agendaI18n = {
    getLanguage,
    setLanguage,
    translate: translateText,
    translateDocument,
  };

  translateDocument();
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") {
        translateNode(mutation.target);
        return;
      }
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          translateNode(node);
        } else if (node instanceof Element) {
          const walker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT,
          );
          let textNode = walker.nextNode();
          while (textNode) {
            translateNode(textNode);
            textNode = walker.nextNode();
          }
          translateAttributes(node);
        }
      });
    });
  });
  observer.observe(document.body, {
    childList: true,
    characterData: true,
    subtree: true,
  });
})();
