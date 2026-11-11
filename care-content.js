const quickMessageTemplates = [
  {
    "key": "reschedule-consultation",
    "subtitle": "Reschedule a consultation",
    "category": "Appointments",
    "body": "Hi <>,\n\nLet me know if you'd like to reschedule your consult with the doctor and I'd be happy to assist. Whenever you're ready, we're here to help!"
  },
  {
    "key": "missed-first-treatment",
    "subtitle": "Missed first treatment",
    "category": "Appointments",
    "body": "Hi <>,\n\nWe missed you for your first treatment. I hope everything is okay. If anything came up or you need to adjust the timing, we’re here and happy to help you get rescheduled. Please feel free to reach out whenever you’re ready — we’re here for you."
  },
  {
    "key": "missed-consultation",
    "subtitle": "Missed consultation",
    "category": "Appointments",
    "body": "Hi <>,\n\nWe missed you for your consultation. I hope everything is okay. If anything came up or you need to adjust the timing, we’re here and happy to help you get rescheduled. Please feel free to reach out whenever you’re ready — we’re here for you."
  },
  {
    "key": "evaluation-reschedule",
    "subtitle": "Evaluation reschedule follow-up",
    "category": "Follow-up",
    "body": "Good afternoon, <>!\n\nWe haven't been able to reach you to reschedule your eval, but I wanted to let you know we're still here as a resource. If you'd like to discuss next steps, feel free to give us a call or reply to this text anytime."
  },
  {
    "key": "previous-conversation",
    "subtitle": "Previous conversation check-in",
    "category": "Follow-up",
    "body": "Good afternoon, <>! This is {{staffName}} with Renue Wellness.\n{{org:website}}\n\nWe spoke last week about our mental health treatments. I was just reaching out to say hi and see if it's still something you're interested in."
  },
  {
    "key": "ready-for-treatment",
    "subtitle": "Ready for treatment check-in",
    "category": "Follow-up",
    "body": "Hi <>,\n\nJust checking in to see how you're doing. We’d love to support you in taking the next step toward healing. If you're ready, we can help you schedule your treatment at a time that works best for you. No pressure — just know we’re here when you need us!"
  },
  {
    "key": "not-ready",
    "subtitle": "Not ready yet · Supportive check-in",
    "category": "Follow-up",
    "body": "Hi <>,\n\nJust wanted to check in and see how you've been doing. I know you mentioned not feeling ready, and I was wondering if there's anything I can do or talk through with you to help you feel more supported in making this decision. I don't want uncertainty to stand in the way of you feeling better if this could help. No pressure at all — I'm just here to support you however I can."
  },
  {
    "key": "ivk-spravato-overview",
    "subtitle": "IVK & Spravato overview",
    "category": "Treatment information",
    "body": "Hi <>,\n\nIV ketamine (IVK) and Spravato are two of our treatment options. Our provider can help determine which is appropriate for you.\n\n• IVK infusions: the clinic’s initial protocol is 6 infusions over 3 weeks — twice a week for 3 consecutive weeks. IVK is self-pay under the clinic’s guidance, and payment options are available.\n\n• Spravato: a prescription nasal spray for eligible adults with treatment-resistant depression. The initial schedule is twice a week for 4 weeks, then once a week for 4 weeks, followed by maintenance directed by the provider. Insurance coverage depends on the plan, clinical criteria and authorisation.\n\nWe can help arrange an evaluation and check the next steps.",
    "note": "Confirm clinic availability and the provider’s treatment plan. Previous antidepressant trials alone do not guarantee insurance coverage."
  },
  {
    "key": "integration-therapy",
    "subtitle": "Integration therapy between sessions",
    "category": "Treatment information",
    "body": "Hi <>,\n\nWe do not offer integration therapy during the treatment session. Therapy between ketamine sessions can provide time to reflect on the emotions, insights or shifts in perspective that came up during treatment.\n\nYour provider or therapist can help you plan appropriate support between sessions and discuss how to build on your treatment experience.",
    "note": "Discuss integration support and timing with the treating provider."
  },
  {
    "key": "no-response-after-consult",
    "subtitle": "No response after consult / evaluation",
    "category": "Follow-up",
    "body": "Hi <>! This is {{staffName}} from Renue just checking in one last time! We haven’t seen you in the clinic lately and wanted to make sure you’re doing okay. We’d love to help you continue your treatment journey if you’re ready to get back on schedule or need to make any adjustments.\n\nYour provider can advise you on continuing treatment and maintaining your progress.\n\nWe also wanted to let you know that insurance authorisations can expire if treatment is paused for too long, which may require restarting the approval process. If we don’t hear back from you, your account will be inactivated for now, but you’re always welcome to reconnect with us in the future.",
    "note": "Use only when the clinic’s follow-up and account-inactivation process applies; confirm authorisation status before sending."
  }
];

const careResources = [
  {
    "title": "Getting Started at Renue Wellness | Ketamine & Spravato Treatment Options Explained",
    "category": "Education",
    "url": "https://www.youtube.com/watch?v=YBdIpGCcvr0",
    "note": "Renue treatment introduction",
    "stage": "Getting started"
  },
  {
    "title": "Ketamine Therapy FAQs: Safety, What to Expect, and Results Explained - Renue Wellness",
    "category": "Education",
    "url": "https://www.youtube.com/watch?v=rlDzWtyYzOA",
    "note": "Safety, expectations and results overview",
    "stage": "Getting started"
  },
  {
    "title": "What to Expect From Your First Ketamine or Spravato Treatment | A Calm, Supportive Guide",
    "category": "Education",
    "url": "https://www.youtube.com/watch?v=AVfKZsAtvh8",
    "note": "Preparation for the first treatment appointment",
    "stage": "2 days before treatment"
  },
  {
    "title": "How Ketamine Therapy Creates Change — and How You Make It Last",
    "category": "Education",
    "url": "https://www.youtube.com/watch?v=EePmdpOFoS0",
    "note": "Follow-up educational video",
    "stage": "After first treatment"
  },
  {
    "title": "Yale Short Video",
    "category": "Education",
    "url": "https://www.youtube.com/watch?v=nW21-AYY_fs",
    "note": "Existing educational resource from Yale"
  },
  {
    "title": "Lara’s Testimonial — IV Ketamine Treatments for Depression",
    "category": "IVK testimonials",
    "url": "https://www.youtube.com/watch?v=et1zDraHSnE",
    "note": "Patient testimonial"
  },
  {
    "title": "Tonya’s Testimonial — IV Ketamine Treatments for Depression",
    "category": "IVK testimonials",
    "url": "https://www.youtube.com/watch?v=FkIZdSvnY2c",
    "note": "Patient testimonial"
  },
  {
    "title": "Esther — IV Ketamine Treatments for Bipolar Disorder",
    "category": "IVK testimonials",
    "url": "https://www.youtube.com/watch?v=L6rX7euI93k",
    "note": "Patient testimonial"
  },
  {
    "title": "IV ketamine patient testimonial · Vimeo",
    "category": "IVK testimonials",
    "url": "https://vimeo.com/1073373624?fl=pl&fe=sh",
    "note": "IV ketamine patient experience"
  },
  {
    "title": "Lisa’s Testimonial — IV Ketamine Treatment for Depression & Anxiety",
    "category": "IVK testimonials",
    "url": "https://www.youtube.com/watch?v=IGAj9g82dg0&t=20s",
    "note": "Patient testimonial · Starts at 0:20"
  },
  {
    "title": "Christina Spravato Testimonial — RIT",
    "category": "Spravato testimonials",
    "url": "https://vimeo.com/1135187923?fl=pl&fe=sh",
    "note": "External provider testimonial · RIT"
  },
  {
    "title": "Fred’s Testimonial — 865 Ketamine + Wellness",
    "category": "Spravato testimonials",
    "url": "https://vimeo.com/1106989393?fl=pl&fe=sh",
    "note": "External provider testimonial · 865 Ketamine + Wellness"
  },
  {
    "title": "Rachel Testimonial — RIT",
    "category": "Spravato testimonials",
    "url": "https://vimeo.com/1135188701",
    "note": "External provider testimonial · RIT"
  },
  {
    "title": "Natasha’s Testimonial — 865 Ketamine + Wellness",
    "category": "Spravato testimonials",
    "url": "https://vimeo.com/1106989173",
    "note": "External provider testimonial · 865 Ketamine + Wellness"
  },
  {
    "title": "Nancy’s Deep TMS Testimonial for Depression",
    "category": "TMS testimonials",
    "url": "https://www.youtube.com/watch?v=my1p-cnX_2s&t=50s",
    "note": "Patient testimonial · Starts at 0:50"
  },
  {
    "title": "Cora’s Deep TMS Testimonial for Depression",
    "category": "TMS testimonials",
    "url": "https://www.youtube.com/watch?v=ik59jvpU5xw",
    "note": "Patient testimonial"
  },
  {
    "title": "Corey’s Testimonial — TMS Treatment for Depression",
    "category": "TMS testimonials",
    "url": "https://www.youtube.com/watch?v=Ib3Jfn4DVU0",
    "note": "Patient testimonial"
  },
  {
    "title": "Renue Wellness website",
    "category": "Other",
    "url": "{{org:website}}",
    "note": "Company website"
  },
  {
    "title": "Advance Care financing",
    "category": "Other",
    "url": "{{org:advancecare}}",
    "note": "Financing information to send to a patient"
  }
];

const treatmentGuides = [
  {
    "id": "ivk",
    "name": "IV ketamine",
    "label": "IVK · Infusions",
    "summary": "Clinic reference for IV ketamine intake discussions.",
    "facts": [
      [
        "Initial course",
        "6 infusions over 3 weeks"
      ],
      [
        "Frequency",
        "2 sessions per week for 3 consecutive weeks"
      ],
      [
        "Pricing",
        "Select a clinic for prices"
      ]
    ],
    "sections": [
      [
        "Treatment overview",
        "IVK is used for depression, anxiety, PTSD, OCD and certain other conditions. A provider assesses suitability. Psychiatric use of IV ketamine is off-label; it is not FDA-approved for psychiatric conditions."
      ],
      [
        "Insurance & payment",
        "IVK is self-pay. HSA/FSA funds may be used for eligible expenses; CareCredit and Advance Care are financing options subject to approval and current terms. See Financing for copyable links."
      ],
      [
        "Transport",
        "Patients need a ride to and from appointments under the clinic’s transport policy. Confirm pickup and escort arrangements before scheduling."
      ],
      [
        "Integration support",
        "Integration therapy is not offered during the treatment session. Discuss between-session therapy and ongoing support with the provider."
      ]
    ],
    "note": "Chelsea’s $400 opening sale applies only to Chelsea. Standard and promotional prices follow the selected clinic."
  },
  {
    "id": "spravato",
    "name": "Spravato",
    "label": "Esketamine · Nasal spray",
    "summary": "Provider evaluation, insurance authorisation and supervised treatment.",
    "facts": [
      [
        "Weeks 1–4",
        "Twice weekly"
      ],
      [
        "Weeks 5–8",
        "Once weekly"
      ],
      [
        "Maintenance",
        "Provider-directed schedule"
      ],
      [
        "Observation",
        "At least 2 hours each treatment"
      ]
    ],
    "sections": [
      [
        "Treatment overview",
        "Prescription esketamine nasal spray is used for eligible adults with treatment-resistant depression. The provider confirms the indication and treatment plan."
      ],
      [
        "Getting started",
        "Intake collects insurance information and schedules a provider evaluation. The clinic then works on prior authorisation and contacts the patient to schedule treatment once approved. Authorisation typically takes 1–2 days; insurer processing may vary."
      ],
      [
        "Eligibility & coverage",
        "Ask about prior antidepressant trials, but do not promise coverage based only on two medications. Clinical criteria, plan rules and authorisation determine coverage. The treating provider assesses benefit and the need for ongoing treatment."
      ],
      [
        "Transport",
        "Arrange transport home. Spravato’s prescribing information says not to drive or operate machinery until the next day after restful sleep. Follow the clinic’s ride and escort requirements."
      ]
    ],
    "note": "The schedule is an intake reference for TRD, not an individual prescription. Treatment frequency and continuation are determined by the provider."
  },
  {
    "id": "tms",
    "name": "TMS",
    "label": "Transcranial magnetic stimulation",
    "summary": "A non-invasive treatment using magnetic pulses.",
    "facts": [
      [
        "Clinic schedule",
        "5 days per week for several weeks"
      ],
      [
        "Appointment length",
        "20–40 minutes"
      ],
      [
        "Self-pay price",
        "$200 per treatment"
      ],
      [
        "Age guidance",
        "15+ · Confirm eligibility"
      ]
    ],
    "sections": [
      [
        "Treatment overview",
        "TMS uses magnetic pulses to stimulate brain regions involved in mood regulation. The provider determines whether the treatment and device are appropriate for the patient."
      ],
      [
        "Eligibility discussion",
        "Eligibility assessment includes major depressive disorder or treatment-resistant depression and at least two attempted medications. Confirm the clinic’s assessment requirements, device-specific age clearance and the insurer’s criteria before promising eligibility."
      ],
      [
        "Insurance",
        "Insurance may help cover treatment, subject to the plan and authorisation. Refer to Insurance for the selected clinic’s scheduling rules and Crestview’s treatment preferences."
      ]
    ],
    "note": "Adolescent eligibility depends on the device, indication, clinic assessment and payer. Age alone does not establish eligibility."
  }
];

const ivkPricingByClinic = {
  NY: { standard: 500, promo: 450 },
  CHELSEA: { standard: 500, promo: 450, openingSale: 400 },
  NJ: { standard: 525, promo: 475 },
};
