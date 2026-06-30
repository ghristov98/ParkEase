export interface MunicipalParking {
  id: string;
  name: string;
  nameEn: string;
  type: "paid" | "penalty_official";
  operator: string;
  lat: number;
  lng: number;
  permanent?: boolean;
}

export const OFFICIAL_PENALTY: MunicipalParking = {
  id: "penalty_official",
  name: "Наказателен паркинг",
  nameEn: "Official Penalty Parking",
  type: "penalty_official",
  operator: "Общинско Предприятие Транспорт",
  lat: 42.500415,
  lng: 27.474554,
  permanent: true,
};

export const municipalParkings: MunicipalParking[] = [
  {
    id: "parking_1",
    name: "Паркинг: България",
    nameEn: "Parking: Bulgaria",
    type: "paid",
    operator: "Общинско Предприятие Транспорт",
    lat: 42.492645,
    lng: 27.473731,
  },
  {
    id: "parking_2",
    name: "Паркинг: Опера",
    nameEn: "Parking: Opera",
    type: "paid",
    operator: "Общинско Предприятие Транспорт",
    lat: 42.493731,
    lng: 27.468861,
  },
  {
    id: "parking_3",
    name: "Паркинг: БСУ",
    nameEn: "Parking: BSU",
    type: "paid",
    operator: "Общинско Предприятие Транспорт",
    lat: 42.498896,
    lng: 27.471625,
  },
  {
    id: "parking_4",
    name: "Паркинг: Гурко",
    nameEn: "Parking: Gurko",
    type: "paid",
    operator: "Общинско Предприятие Транспорт",
    lat: 42.500184,
    lng: 27.476196,
  },
  {
    id: "parking_5",
    name: "Паркинг: Пиргос",
    nameEn: "Parking: Pirgos",
    type: "paid",
    operator: "Общинско Предприятие Транспорт",
    lat: 42.506257,
    lng: 27.480016,
  },
  {
    id: "parking_6",
    name: "Паркинг: Изгрев - 39 блок",
    nameEn: "Parking: Izgrev - Block 39",
    type: "paid",
    operator: "Общинско Предприятие Транспорт",
    lat: 42.525493,
    lng: 27.467364,
  },
  {
    id: "parking_7",
    name: "Паркинг: Изгрев - 7 блок",
    nameEn: "Parking: Izgrev - Block 7",
    type: "paid",
    operator: "Общинско Предприятие Транспорт",
    lat: 42.528288,
    lng: 27.456386,
  },
  {
    id: "parking_8",
    name: "Паркинг: С3 Младост",
    nameEn: "Parking: S3 Mladost",
    type: "paid",
    operator: "Общинско Предприятие Транспорт",
    lat: 42.518103,
    lng: 27.457878,
  },
];
