export const clinics = ["North Clinic", "Central Clinic", "Coastal Clinic"];
export const treatments = ["IVK", "SPV", "TMS"];
export const advisors = ["Avery Vale", "Rowan Hale", "Quinn Arden"];
export const milestones = ["Evaluation booked", "Evaluation completed", "Moving to treatment", "Treatment started"];
export const barriers = ["Insurance pending", "Scheduling availability", "Financial considerations", "Transportation difficulties"];

export function day(offset = 0, now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() + offset);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

export function makeRecords() {
  const first = ["Ellis", "Jamie", "Marin", "Robin", "Sage", "Emery", "Drew", "River"];
  const last = ["Linden", "Aster", "Marsh", "Pike", "Ash", "Bell", "Wren", "Reed", "Vale"];
  return Array.from({ length: 72 }, (_, index) => {
    const cohort = index % 9;
    const treatment = treatments[index % 3];
    const added = day(-40 + index % 29);
    const events = [{ label: "Added to intake", date: added }];
    const progress = [0, 1, 1, 2, 2, 3, 3, 4, 4][cohort];
    for (let i = 0; i < progress; i++) events.push({ label: milestones[i], date: day(-10 + i * 2) });
    const closed = progress === 2 && index % 4 === 0;
    const paused = !closed && index % 13 === 0;
    return {
      id: String(index + 1), name: first[index % 8] + " " + last[Math.floor(index / 8)],
      advisor: advisors[Math.floor(index / 4) % advisors.length], treatment,
      clinic: clinics[Math.floor(index / 3) % clinics.length], added, events, closed, paused,
      evaluation: progress === 1 ? day(index % 6) : progress > 1 ? day(-8) : "",
      confirmed: progress > 1 || index % 2 === 0,
      start: progress === 3 && index % 2 === 0 ? day(2 + index % 5) : progress === 4 ? day(-4) : "",
      followUp: progress < 4 && !closed && !paused && index % 3 !== 0 ? day(index % 7 - 3) : "",
      requested: progress < 4 && index % 5 === 0,
      barrier: closed ? "" : progress === 2 && treatment === "SPV" ? barriers[0] :
        progress === 3 && index % 2 ? barriers[1] : progress === 2 && index % 7 === 0 ? barriers[2 + index % 2] : "",
      barrierSince: day(-5 - index % 7)
    };
  });
}

export const reached = (record, label) => record.events.some(event => event.label === label);
export const stage = record => record.closed ? "Chose not to proceed" : record.paused ? "Paused" :
  milestones.findLast(label => reached(record, label)) || "New enquiry";
export function queues(records, today = day()) {
  const active = records.filter(record => !record.closed && !record.paused);
  return {
    "Today’s evaluations": active.filter(r => r.evaluation === today),
    "Upcoming evaluations": active.filter(r => r.evaluation > today),
    "Awaiting confirmation": active.filter(r => r.evaluation && r.evaluation >= today && !r.confirmed),
    "Follow-ups due": active.filter(r => r.followUp === today),
    "Follow-ups to review": active.filter(r => r.followUp && r.followUp < today),
    "Upcoming treatment starts": active.filter(r => r.start && r.start >= today),
    "Requested contact without a follow-up": active.filter(r => r.requested && !r.followUp),
  };
}
export function opportunities(records) {
  const active = records.filter(r => !r.closed && !r.paused);
  return [
    ["Insurance bottleneck", "Review authorisation workflows and escalation paths.", active.filter(r => r.barrier === barriers[0])],
    ["Continuity of communication", "Review coordination for patients who requested contact and have no recorded follow-up.", queues(active)["Requested contact without a follow-up"]],
    ["Treatment scheduling", "Review appointment availability for recorded treatment decisions awaiting a start date.", active.filter(r => reached(r, milestones[2]) && !r.start && !reached(r, milestones[3]))],
    ["Practical barriers", "Review available financial and transportation resources.", active.filter(r => barriers.slice(2).includes(r.barrier))],
  ];
}
