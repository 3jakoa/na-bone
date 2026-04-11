import type { University, City } from "@/lib/supabase/types";

export const UNIVERSITIES: University[] = [
  "Univerza v Ljubljani",
  "Univerza v Mariboru",
  "Univerza na Primorskem",
  "Univerza v Novi Gorici",
];

export const CITIES: City[] = [
  "Ljubljana",
  "Maribor",
  "Koper",
  "Nova Gorica",
  "Kranj",
  "Celje",
  "Novo Mesto",
];

export const FACULTIES: Record<University, string[]> = {
  "Univerza v Ljubljani": [
    "Biotehniška fakulteta",
    "Ekonomska fakulteta",
    "Fakulteta za arhitekturo",
    "Fakulteta za družbene vede",
    "Fakulteta za elektrotehniko",
    "Fakulteta za farmacijo",
    "Fakulteta za gradbeništvo",
    "Fakulteta za kemijo",
    "Fakulteta za matematiko in fiziko",
    "Fakulteta za računalništvo in informatiko",
    "Filozofska fakulteta",
    "Medicinska fakulteta",
    "Pedagoška fakulteta",
    "Pravna fakulteta",
    "Teološka fakulteta",
    "Veterinarska fakulteta",
  ],
  "Univerza v Mariboru": [
    "Ekonomsko-poslovna fakulteta",
    "Fakulteta za elektrotehniko, računalništvo in informatiko",
    "Fakulteta za energetiko",
    "Fakulteta za gradbeništvo, prometno inženirstvo in arhitekturo",
    "Fakulteta za kmetijstvo in biosistemske vede",
    "Fakulteta za logistiko",
    "Fakulteta za naravoslovje in matematiko",
    "Fakulteta za organizacijske vede",
    "Fakulteta za pravo",
    "Filozofska fakulteta",
    "Medicinska fakulteta",
    "Pedagoška fakulteta",
  ],
  "Univerza na Primorskem": [
    "Fakulteta za humanistične študije",
    "Fakulteta za management",
    "Fakulteta za matematiko, naravoslovje in informacijske tehnologije",
    "Pedagoška fakulteta",
    "Turistica",
  ],
  "Univerza v Novi Gorici": [
    "Fakulteta za naravoslovje",
    "Fakulteta za podiplomski študij",
    "Poslovno-tehniška fakulteta",
    "Šola za vinogradništvo in vinarstvo",
    "Visoka šola za umetnost",
  ],
};
