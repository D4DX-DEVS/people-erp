import { LegalDocument, type LegalSection } from "@/components/site/LegalDocument";

const OFFICE_ADDRESS =
  "People's Foundation, Ponmuliparambu, Kottooli P.O, Arayidathupalam, Mavoor Road, Kozhikode - 673016";

const SECTIONS: LegalSection[] = [
  {
    title: "1. Introduction",
    blocks: [
      "Welcome to the website of People's Foundation (\"the Foundation\", \"we\", \"us\" or \"our\"), a charitable organisation based at Indira Gandhi Road, Kottooli, Kozhikode, Kerala, India. These Terms and Conditions (\"Terms\") govern your access to and use of https://peoplesfoundation.org and any related pages, forms, donation facilities and online services (together, \"the Website\").",
      "By accessing or using the Website, making a donation, or submitting an application or enquiry through it, you confirm that you have read, understood and agreed to these Terms. If you do not agree, please do not use the Website.",
    ],
  },
  {
    title: "2. About the Foundation",
    blocks: [
      "People's Foundation works for the welfare of marginalised and disaster-affected communities in Kerala through programmes such as People's Village, People's Home, People's Start Up, People's Edu Support, People's Drinking Water, mental health and counselling services, People's info, and emergency relief and rehabilitation.",
      {
        list: [
          "Registered as: Trust, 349/iv/12",
          "PAN: AACTP2725K",
          "80G registration: AACTP2725K23KC01",
          "12A registration: AACTP2725K25KC01",
          "FCRA registration: not applicable",
          `Registered office: ${OFFICE_ADDRESS}`,
          "Email: info@peoplefoundation.org | Phone: +914959876543",
        ],
      },
    ],
  },
  {
    title: "3. Eligibility and Use of the Website",
    blocks: [
      "You may use the Website only if you are legally capable of entering into a binding contract under Indian law. Persons below 18 years of age may use the Website only under the supervision of a parent or guardian, and may not make payments independently.",
      "You agree to use the Website only for lawful purposes. You must not:",
      {
        list: [
          "provide false, misleading or incomplete information in any form or application;",
          "impersonate any person or organisation;",
          "attempt to gain unauthorised access to the Website, its servers, databases or administrative systems;",
          "introduce viruses, malicious code or automated tools that disrupt the Website;",
          "copy, scrape or misuse donor, beneficiary or applicant data;",
          "use the Website to solicit funds, advertise or promote any third party without our written permission.",
        ],
      },
    ],
  },
  {
    title: "4. Donations",
    blocks: [
      {
        term: "4.1 Voluntary contributions.",
        text: "All donations made through the Website are voluntary and are made to support the charitable objects of the Foundation. A donation does not create any ownership, membership, commercial or contractual right over the Foundation's assets or decisions.",
      },
      {
        term: "4.2 Use of funds.",
        text: "Donations are used for the project or purpose selected by the donor, where a specific project is chosen. If a project is fully funded, completed, or cannot be carried out for reasons beyond our control, the Foundation may apply the funds to another programme with a similar charitable purpose. Up to a reasonable proportion of donations may be used for administration and fundraising costs necessary to run the Foundation, as permitted by law and our governing documents.",
      },
      {
        term: "4.3 Payment processing.",
        text: "Online payments are processed through third-party payment gateways and banks. The Foundation does not store your card, UPI PIN, net-banking credentials or similar sensitive payment details. Your use of a payment gateway is also subject to that provider's terms and privacy policy. We are not responsible for failures, delays or errors caused by the gateway, your bank or your network.",
      },
      {
        term: "4.4 Donor information.",
        text: "You agree to provide accurate details, including name, contact details and, where a receipt or tax benefit is required, PAN and address. The Foundation is not liable for a receipt or tax benefit that cannot be issued because of incorrect or incomplete details.",
      },
      {
        term: "4.5 Receipts and tax exemption.",
        text: "An acknowledgement or receipt will be sent to the email address or phone number provided after a successful donation. Tax exemption under Section 80G of the Income Tax Act, 1961 (or the corresponding provision of any replacement law) is available only where the Foundation holds valid registration at the time of donation and the donor provides the required details. The donor is responsible for claiming the benefit as per applicable law.",
      },
      {
        term: "4.6 Anti-money-laundering.",
        text: "The Foundation may seek identity or source-of-funds information and may decline or return any donation that appears suspicious or inconsistent with applicable law.",
      },
      {
        term: "4.7 Refunds.",
        text: "Donations are governed by our Refund and Cancellation Policy, which forms part of these Terms.",
      },
    ],
  },
  {
    title: "5. Scheme and Programme Applications",
    blocks: [
      "Some pages of the Website allow individuals, families or entrepreneurs to apply for or enquire about the Foundation's schemes and services, for example educational support, housing, start-up and entrepreneurship support, counselling or consultation.",
      {
        list: [
          "Submitting an application or form does not guarantee selection, assistance or any benefit.",
          "All applications are assessed by the Foundation according to its eligibility criteria, available resources, verification and field inspection.",
          "The Foundation's decision on any application is final, and it may request additional documents at any stage.",
          "If any information or document is found to be false, the application may be rejected, and assistance already given may be withdrawn or recovered where appropriate.",
          "Assistance is provided free of charge. The Foundation never asks applicants to pay money to be selected. Please report any person who demands payment in the Foundation's name.",
        ],
      },
    ],
  },
  {
    title: "6. Volunteers, Partners and Sponsors",
    blocks: [
      "Volunteers, partner organisations, CSR partners and sponsors are engaged under separate written arrangements or guidelines issued by the Foundation. Registration through the Website does not create an employment, agency or partnership relationship. The Foundation may accept or decline any offer of support at its discretion.",
    ],
  },
  {
    title: "7. Intellectual Property",
    blocks: [
      "All content on the Website, including the name and logo of People's Foundation, its project names and logos, text, brochures, photographs, graphics, videos, reports and design, is the property of the Foundation or is used with permission, and is protected by Indian copyright and trademark law.",
      "You may view and share Website content for personal, non-commercial and charitable awareness purposes, provided you credit People's Foundation and do not alter the content. Any other use, including commercial use, requires prior written permission.",
    ],
  },
  {
    title: "8. Photographs, Stories and Beneficiary Privacy",
    blocks: [
      "The Foundation takes care to respect the dignity and privacy of beneficiaries. Images and stories of beneficiaries are published only with consent or in a manner that protects identity, particularly for children, persons with disabilities and persons receiving counselling or medical care. You must not copy, republish or misuse such material in a way that harms any individual or the Foundation.",
    ],
  },
  {
    title: "9. Privacy and Data Protection",
    blocks: [
      "The Foundation collects and uses personal data in accordance with its Privacy Policy and the Digital Personal Data Protection Act, 2023 and other applicable law. By using the Website, you consent to the collection and use of your data for processing donations, issuing receipts, assessing applications, sending updates about the Foundation's work (which you may opt out of at any time) and meeting legal and audit requirements. We do not sell your personal data. Data may be shared only with payment processors, service providers, auditors and authorities where required.",
    ],
  },
  {
    title: "10. Communications",
    blocks: [
      "By providing your phone number or email address, you agree that the Foundation may contact you about your donation, application or enquiry, and (unless you opt out) about its projects, appeals and events. You may withdraw consent for promotional communication by writing to us at info@peoplefoundation.org.",
    ],
  },
  {
    title: "11. Third-Party Links and Content",
    blocks: [
      "The Website may link to external websites, social media pages and payment platforms. These are provided for convenience. The Foundation does not control or endorse them and is not responsible for their content, accuracy, security or privacy practices.",
    ],
  },
  {
    title: "12. Accuracy of Information",
    blocks: [
      "We try to keep the information on the Website, including project details, figures and impact statistics, accurate and current. However, the Website is provided \"as is\" and we do not guarantee that it will always be complete, error-free or uninterrupted. Project details, targets and timelines may change due to circumstances such as disasters, funding levels, government approvals or beneficiary needs.",
    ],
  },
  {
    title: "13. Disclaimer and Limitation of Liability",
    blocks: [
      "To the fullest extent permitted by law, the Foundation, its trustees, office bearers, employees and volunteers shall not be liable for any direct, indirect, incidental or consequential loss arising from:",
      {
        list: [
          "your use of, or inability to use, the Website;",
          "technical failures, interruption, cyber-attacks, or unauthorised access beyond our reasonable control;",
          "errors or delays in payment processing by third parties;",
          "reliance on any information on the Website.",
        ],
      },
      "Nothing in these Terms excludes liability that cannot be excluded under applicable law.",
    ],
  },
  {
    title: "14. Indemnity",
    blocks: [
      "You agree to indemnify and hold harmless the Foundation and its trustees, office bearers, employees and volunteers against any claim, loss or expense arising from your breach of these Terms, your misuse of the Website, or your violation of any law or the rights of any third party.",
    ],
  },
  {
    title: "15. Suspension and Termination",
    blocks: [
      "The Foundation may suspend or restrict your access to the Website, reject an application, or decline a donation at any time, without notice, if we believe you have breached these Terms, acted unlawfully or put the Website or the Foundation's reputation at risk.",
    ],
  },
  {
    title: "16. Force Majeure",
    blocks: [
      "The Foundation is not responsible for any failure or delay in performing its obligations caused by events beyond its reasonable control, including natural disasters, epidemics, government orders, strikes, power or internet failure, or banking and payment system outages.",
    ],
  },
  {
    title: "17. Changes to These Terms",
    blocks: [
      "We may revise these Terms from time to time. The updated version will be posted on this page with a new \"last updated\" date. Continued use of the Website after changes are posted means you accept the revised Terms.",
    ],
  },
  {
    title: "18. Governing Law and Jurisdiction",
    blocks: [
      "These Terms are governed by the laws of India. Subject to any dispute-resolution process the Foundation may offer, the courts at Kozhikode, Kerala shall have exclusive jurisdiction over any dispute arising out of or relating to these Terms or the Website.",
    ],
  },
  {
    title: "19. Grievance Redressal",
    blocks: [
      "If you have a complaint or concern about the Website, a donation, or the use of your data, please contact our Grievance Officer:",
      {
        list: [
          "Name: Ismail T",
          "Email: info@peoplesfoundation.org",
          "Phone: +919072311310",
          `Address: ${OFFICE_ADDRESS}`,
        ],
      },
      "We will acknowledge your complaint within 48 hours and aim to resolve it within 15 working days.",
    ],
  },
  {
    title: "20. Contact Us",
    blocks: [
      "For any questions about these Terms, please write to People's Foundation at info@peoplesfoundation.org or call +91-495-9876543.",
    ],
  },
];

export default function TermsAndConditions() {
  return (
    <LegalDocument
      title="Terms and Conditions"
      subtitle="People's Foundation, Kozhikode, Kerala"
      meta="Website: https://peoplesfoundation.org | Last updated: 20 November 2026"
      sections={SECTIONS}
    />
  );
}
