// This finder prioritizes topics, not eligibility. Agencies determine current rules.
export const PROGRAMS = [
  {
    name: "SNAP food assistance",
    topic: "food",
    url: "https://www.fns.usda.gov/snap/state-directory",
    description:
      "Ask your state agency about food assistance and how to apply.",
  },
  {
    name: "WIC nutrition support",
    topic: "youngFamily",
    url: "https://www.fns.usda.gov/wic",
    description:
      "Explore nutrition support for eligible pregnant or postpartum people, infants and children under five.",
  },
  {
    name: "Housing and shelter assistance",
    topic: "housing",
    url: "https://www.hud.gov/topics/homelessness/localassist",
    description:
      "Find local housing assistance; availability and waiting lists vary.",
  },
  {
    name: "Veterans benefits",
    topic: "veteran",
    url: "https://www.va.gov/resources/",
    description: "Explore VA health care, housing and other benefits.",
  },
  {
    name: "SSI and disability benefits",
    topic: "disability",
    url: "https://www.ssa.gov/benefits/disability/",
    description:
      "Review the Social Security Administration’s disability benefit programs.",
  },
  {
    name: "TANF family assistance",
    topic: "children",
    url: "https://www.acf.hhs.gov/ofa/programs/tanf",
    description:
      "Find state or tribal family cash assistance and support services.",
  },
  {
    name: "Medicaid health coverage",
    topic: "health",
    url: "https://www.medicaid.gov/about-us/where-can-people-get-help-medicaid-chip",
    description: "Contact your state about health coverage and eligibility.",
  },
  {
    name: "LIHEAP energy assistance",
    topic: "utilities",
    url: "https://www.acf.hhs.gov/ocs/programs/liheap",
    description: "Explore help with home energy costs through local agencies.",
  },
  {
    name: "Older adult services",
    topic: "senior",
    url: "https://eldercare.acl.gov/",
    description:
      "Find nutrition, care and community support through Eldercare Locator.",
  },
];
export function findPrograms(selected) {
  return PROGRAMS.filter((program) => selected[program.topic] === true);
}
