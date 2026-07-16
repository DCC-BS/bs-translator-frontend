export const domains = [
    "None",
    "Government",
    "Legal",
    "Medical",
    "Technical",
    "Financial",
    "Scientific",
    "Marketing",
    "Literary",
    "Educational",
    "Hospitality and Tourism",
    "Information Technology",
    "Agriculture",
    "Energy",
    "Real Estate",
    "Human Resources",
    "Pharmaceutical",
    "Art and Culture",
    "Logistics and Transportation",
] as const;

export type Domain = (typeof domains)[number];
