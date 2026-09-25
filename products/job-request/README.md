# Job Request

A customer opens this page on their phone, fills in a short form, and taps
**Send via WhatsApp**. WhatsApp opens with a complete, tidy message to the
business: name, phone, area, job type, urgency and details. No missing info,
no call-backs just to ask "where are you?".

## Go live (Tiro's steps)
1. Put the business WhatsApp number in `config.js` (digits only, starting 27).
2. Approve hosting (any static host; GitHub Pages is free for public repos).

Until step 1 is done the page runs in **preview mode**: it shows the message
instead of sending it, so no customer is ever routed to a wrong number.

## Try it locally
From the repository root: `npx serve products/job-request` (or any static
server), then open the printed address. Opening the file directly will not
work because browsers block modules from `file://`.

Nothing is stored anywhere. The customer's details go only into the WhatsApp
message they choose to send.
