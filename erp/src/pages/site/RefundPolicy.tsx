import { LegalDocument, type LegalSection } from "@/components/site/LegalDocument";

const OFFICE_ADDRESS =
  "People's Foundation, Ponmuliparambu, Kottooli P.O, Arayidathupalam, Mavoor Road, Kozhikode - 673016";

const SECTIONS: LegalSection[] = [
  {
    title: "1. Purpose",
    blocks: [
      "People's Foundation (\"the Foundation\") is a charitable organisation, and every contribution we receive is put to work for people in need. This policy explains when a donation or other payment made through https://peoplesfoundation.org can be cancelled or refunded, and how to request it. It forms part of our Terms and Conditions.",
    ],
  },
  {
    title: "2. General Rule: Donations Are Non-Refundable",
    blocks: [
      "Donations are voluntary gifts made for charitable purposes. Once a donation is successfully received, it is treated as given to the Foundation, is used for its charitable work, and cannot be cancelled or refunded, except in the cases listed in Section 3.",
      "We request donors to check the amount, the project and their details carefully before confirming a payment.",
    ],
  },
  {
    title: "3. Cases Where a Refund May Be Considered",
    blocks: [
      "A refund will be considered only in the following situations:",
      {
        list: [
          "Duplicate payment: the same donation was charged more than once because of a technical error or accidental double submission.",
          "Wrong amount: an amount different from the one intended was entered by mistake (for example, an extra zero), and the request is made promptly.",
          "Failed transaction with debit: money was debited from your account but the donation was not confirmed in our records. In this case the amount is normally reversed automatically by the bank or payment gateway.",
          "Unauthorised transaction: the payment was made without your authorisation, for example by misuse of your card or UPI account.",
          "Other exceptional reasons: any other genuine case that the Foundation, at its sole discretion, finds reasonable.",
        ],
      },
    ],
  },
  {
    title: "4. Cases Where a Refund Will Not Be Given",
    blocks: [
      "Refunds will not ordinarily be given where:",
      {
        list: [
          "the donor simply changes their mind after a successful donation;",
          "the request is made more than 7 days after the date of the donation (except unauthorised transactions, see Section 3);",
          "the donation has already been spent or committed to a project, beneficiary or event;",
          "the donor selected the wrong project, in which case we may offer to redirect the funds instead of refunding them (Section 7);",
          "the donor wants a refund solely because they did not receive, or cannot use, a tax receipt due to incorrect details they provided;",
          "the payment appears to be fraudulent or the request is found to be false or abusive.",
        ],
      },
    ],
  },
  {
    title: "5. How to Request a Refund",
    blocks: [
      "Please write to us within 7 days of the transaction through:",
      {
        list: [
          "Email: info@peoplefoundation.org",
          "Phone / WhatsApp: +91-495-9876543",
          `Postal address: ${OFFICE_ADDRESS}`,
        ],
      },
      "Your request should include:",
      {
        ordered: true,
        list: [
          "Full name, phone number and email address used for the donation;",
          "Date, amount and mode of payment;",
          "Transaction ID, UTR number or payment reference, and the receipt number if available;",
          "A screenshot of the bank or payment message, where possible;",
          "The reason for the request.",
        ],
      },
    ],
  },
  {
    title: "6. Processing of Approved Refunds",
    blocks: [
      {
        list: [
          "We will acknowledge your request within 3 working days.",
          "We may take up to 7 working days to verify the transaction with our payment gateway and bank.",
          "Approved refunds will be returned to the original payment source (card, UPI, bank account or wallet). Refunds are not made in cash or to a different account.",
          "After we initiate the refund, your bank or payment provider may take a further 5 to 10 working days to credit it. Timelines depend on the bank and are outside our control.",
          "If a receipt has already been issued for the refunded donation, it will be cancelled and cannot be used to claim tax exemption.",
          "Payment gateway charges or bank fees may be deducted from the refund where the gateway does not return them, except in cases of our own error or duplicate charges.",
        ],
      },
    ],
  },
  {
    title: "7. Changing the Project or Purpose of a Donation",
    blocks: [
      "If you chose the wrong project by mistake, please contact us within 7 days. Where the funds have not yet been allocated, we will try to redirect your donation to the project you intended. If your donation has been used, it will remain with the project it was applied to.",
    ],
  },
  {
    title: "8. Recurring and Monthly Donations",
    blocks: [
      "If you have set up a recurring donation (for example a monthly pledge or standing instruction):",
      {
        list: [
          "You may cancel at any time by writing to us or by cancelling the mandate through your bank, card issuer or UPI app.",
          "Please request cancellation at least 5 working days before the next debit date so it can be processed in time.",
          "Cancellation stops future payments only. Instalments already paid are treated as completed donations and are not refunded, except under Section 3.",
          "If you are charged after your cancellation has been confirmed, the amount will be refunded in full.",
        ],
      },
    ],
  },
  {
    title: "9. Pledges and Sponsorships",
    blocks: [
      "A pledge or sponsorship (for example sponsoring a house under People's Village, a student under People's Edu Support, or a project by a company under CSR) is a commitment made by the donor to fund a specific cause. Cancellation or reduction of a pledge after the Foundation has begun work or made commitments on the strength of it requires written notice and the Foundation's approval. Amounts already received and used or committed will not be refunded. Corporate and CSR contributions are also governed by the agreement or MoU signed with the Foundation.",
    ],
  },
  {
    title: "10. Event, Training and Programme Registrations",
    blocks: [
      "Most of the Foundation's programmes, schemes and services are provided free of charge, and the Foundation does not ask beneficiaries to pay for selection or assistance. If a fee or contribution is collected for a specific event, workshop, training or consultation:",
      {
        list: [
          "You may cancel your registration up to 5 days before the start date for a refund of the amount paid, less applicable payment charges.",
          "No refund will be made for cancellation after that date or for non-attendance.",
          "If the Foundation cancels or postpones the event, you may choose a full refund or transfer to the next date.",
        ],
      },
    ],
  },
  {
    title: "11. Cancellation or Change by the Foundation",
    blocks: [
      "The Foundation may cancel or change a campaign, event or project, and in such a case:",
      {
        list: [
          "funds donated to a cancelled campaign will be redirected to a similar charitable project, unless the donor asks for a refund within 15 days of being informed, where the funds remain unspent;",
          "if a campaign exceeds its target, the surplus will be used for related or similar work of the Foundation.",
        ],
      },
    ],
  },
  {
    title: "12. Disputes and Chargebacks",
    blocks: [
      "Before raising a dispute or chargeback with your bank or card issuer, please contact us so that we can sort out the issue quickly. Where a chargeback is raised for a valid donation, the Foundation may submit the transaction records to the bank to contest it.",
    ],
  },
  {
    title: "13. Tax Receipts",
    blocks: [
      "If you receive a refund, the corresponding donation receipt and any 80G certificate issued for it become invalid. Donors who claim a refund after claiming tax benefit are responsible for correcting their records.",
    ],
  },
  {
    title: "14. Changes to This Policy",
    blocks: [
      "The Foundation may update this Refund and Cancellation Policy from time to time. The latest version will always be available on the Website with the revised date.",
    ],
  },
  {
    title: "15. Contact Us",
    blocks: [
      "For refund, cancellation or donation queries:",
      {
        list: [
          OFFICE_ADDRESS,
          "Email: info@peoplefoundation.org",
          "Phone: +91-495-9876543",
          "Office hours: Monday - Saturday, 9:30 AM - 5:00 PM",
        ],
      },
    ],
  },
];

export default function RefundPolicy() {
  return (
    <LegalDocument
      title="Refund and Cancellation Policy"
      subtitle="People's Foundation, Kozhikode, Kerala"
      meta="Website: https://peoplesfoundation.org | Last updated: 20 November 2026"
      sections={SECTIONS}
    />
  );
}
