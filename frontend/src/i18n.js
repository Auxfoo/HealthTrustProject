import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "healthtrust_language";

const ku = {
  "Toggle language": "گۆڕینی زمان",
  "Toggle dark mode": "گۆڕینی دۆخی تاریک",
  "Log out": "چوونەدەرەوە",
  "Connect": "پەیوەستبوون",
  "Connect MetaMask": "پەیوەستبوون بە MetaMask",
  "Loading profile...": "پرۆفایل بار دەکرێت...",
  "Backend": "پاشبنەما",
  "ML": "فێربوونی ئامێر",
  "Register": "تۆمارکردن",
  "The healthcare system in the Kurdistan region still faces many problems in managing and sharing patient records safely between hospitals and clinics. To solve this, our project introduces HealthTrust, a system that uses blockchain and machine learning to make health data more secure and useful. Blockchain helps protect medical records from being changed or accessed without permission, giving patients full control over their information. At the same time, machine learning analyzes medical data without showing personal details to predict possible diseases and help doctors make better decisions. With this project, we aim to make healthcare in Kurdistan more secure, transparent, and intelligent.": "سیستەمی تەندروستی لە هەرێمی کوردستان هێشتا لە بەڕێوەبردن و هاوبەشکردنی تۆمارەکانی نەخۆش بە شێوەیەکی پارێزراو لەنێوان نەخۆشخانە و کلینیکەکاندا کێشەی زۆری هەیە. بۆ چارەسەرکردنی ئەمە، پڕۆژەکەمان HealthTrust پێشکەش دەکات؛ سیستەمێک کە بلۆکچەین و فێربوونی ئامێر بەکاردەهێنێت بۆ ئەوەی داتای تەندروستی پارێزراوتر و بەسوودتر بێت. بلۆکچەین یارمەتی پاراستنی تۆمارە پزیشکییەکان دەدات لە گۆڕانکاری یان دەستگەیشتنی بێ مۆڵەت، و کۆنتڕۆڵی تەواوی زانیارییەکانیان دەداتە نەخۆشان. لە هەمان کاتدا، فێربوونی ئامێر داتای پزیشکی شیدەکاتەوە بەبێ پیشاندانی وردەکارییە کەسییەکان بۆ پێشبینی نەخۆشییە ئەگەرییەکان و یارمەتیدانی پزیشکان لە بڕیاری باشتر. بە ئەم پڕۆژەیە دەمانەوێت تەندروستی لە کوردستان پارێزراوتر، ڕوونتر و زیرەکتر بکەین.",
  "Name": "ناو",
  "Email": "ئیمەیڵ",
  "Role": "ڕۆڵ",
  "Patient": "نەخۆش",
  "Doctor": "پزیشک",
  "Institution Admin": "بەڕێوەبەری دامەزراوە",
  "patient": "نەخۆش",
  "doctor": "پزیشک",
  "institution admin": "بەڕێوەبەری دامەزراوە",
  "Institution": "دامەزراوە",
  "None": "هیچ",
  "Loading institutions...": "دامەزراوەکان بار دەکرێن...",
  "Blood type": "جۆری خوێن",
  "Allergies": "هەستەوەرییەکان",
  "Chronic conditions": "نەخۆشییە درێژخایەنەکان",
  "Emergency contact": "پەیوەندی فریاکەوتن",
  "Institution name": "ناوی دامەزراوە",
  "Institution type": "جۆری دامەزراوە",
  "Hospital": "نەخۆشخانە",
  "Clinic": "کلینیک",
  "Save Profile": "پاشەکەوتکردنی پرۆفایل",
  "Save profile": "پاشەکەوتکردنی پرۆفایل",
  "Waiting for MetaMask...": "چاوەڕوانی MetaMask...",
  "Patient Workspace": "داشبۆردی نەخۆش",
  "Doctor Workspace": "داشبۆردی پزیشک",
  "Institution Workspace": "داشبۆردی دامەزراوە",
  "Records and Access": "تۆمار و دەستگەیشتن",
  "Clinical Review": "پێداچوونەوەی پزیشکی",
  "Organization Access": "دەستگەیشتنی دامەزراوە",
  "Records": "تۆمارەکان",
  "Patients": "نەخۆشەکان",
  "Emergency": "فریاکەوتن",
  "Notes": "تێبینییەکان",
  "Documents": "بەڵگەنامەکان",
  "Membership": "ئەندامێتی",
  "Prediction": "پێشبینی",
  "History": "مێژوو",
  "Audit": "پشکنین",
  "Notifications": "ئاگادارکردنەوەکان",
  "Security": "ئاسایش",
  "Archive": "ئەرشیف",
  "Consent": "ڕەزامەندی",
  "Profile": "پرۆفایل",
  "Analytics": "شیکاری",
  "Doctors": "پزیشکان",
  "Doctor Requests": "داواکارییەکانی پزیشک",
  "Shared": "هاوبەشکراو",
  "My Institution": "دامەزراوەکەم",
  "Shared Keys": "کلیلە هاوبەشکراوەکان",
  "Audit Events": "ڕووداوەکانی پشکنین",
  "Latest Upload": "دوا بارکردن",
  "Load tab": "تاب بار بکە",
  "Risk": "مەترسی",
  "Care Docs": "بەڵگەنامەکانی چاودێری",
  "Upload Details": "زانیاری بارکردن",
  "These details will be saved with the next record you upload.": "ئەم وردەکارییانە لەگەڵ تۆماری داهاتووت پاشەکەوت دەکرێن.",
  "Category": "پۆل",
  "Provider": "دابینکەر",
  "Emergency record": "تۆماری فریاکەوتن",
  "Upload Record": "بارکردنی تۆمار",
  "Uploading...": "بار دەکرێت...",
  "Search records or CID": "گەڕان بۆ تۆمار یان CID",
  "Search records or patient": "گەڕان بۆ تۆمار یان نەخۆش",
  "Filter category": "پاڵاوتنی پۆل",
  "Filter flags": "پاڵاوتنی نیشانەکان",
  "All categories": "هەموو پۆلەکان",
  "Lab": "تاقیگە",
  "Prescription": "ڕەچەتە",
  "Diagnosis": "دەستنیشانکردن",
  "Imaging": "وێنەبرداری",
  "Other": "هیتر",
  "All flags": "هەموو نیشانەکان",
  "Important": "گرنگ",
  "No archived records": "هیچ تۆمارێکی ئەرشیفکراو نییە",
  "No records found": "هیچ تۆمارێک نەدۆزرایەوە",
  "Records you archive will appear here.": "ئەو تۆمارانەی ئەرشیفیان دەکەیت لێرە دەردەکەون.",
  "No records match your search.": "هیچ تۆمارێک لەگەڵ گەڕانەکەت ناگونجێت.",
  "Uploaded records will appear here.": "تۆمارە بارکراوەکان لێرە دەردەکەون.",
  "Manage": "بەڕێوەبردن",
  "View": "بینین",
  "PDF": "PDF",
  "Grant": "پێدان",
  "Revoke": "وەرگرتنەوە",
  "Approve": "پەسەندکردن",
  "Reject": "ڕەتکردنەوە",
  "Complete grant": "تەواوکردنی پێدان",
  "Access Requests": "داواکاری دەستگەیشتن",
  "No Access Requests": "هیچ داواکارییەکی دەستگەیشتن نییە",
  "Patient Consent Summary": "پوختەی ڕەزامەندی",
  "No Care Documents": "هیچ بەڵگەنامەی چاودێری نییە",
  "No Doctor Notes": "هیچ تێبینییەکی پزیشک نییە",
  "Audit Timeline": "مێژووی پشکنین",
  "Doctor Audit Timeline": "مێژووی پشکنینی پزیشک",
  "Institution Audit Timeline": "مێژووی پشکنینی دامەزراوە",
  "Export PDF": "هەناردەکردنی PDF",
  "No history": "هیچ مێژوویەک نییە",
  "No History": "هیچ مێژوویەک نییە",
  "Security Model": "شێوازی ئاسایش",
  "Client-side encryption": "نهێنیکردن لە لای کڕیار",
  "Files are encrypted in the browser before upload. The backend and Pinata do not receive plaintext records.": "پەڕگەکان پێش بارکردن لە وێبگەڕدا نهێنی دەکرێن. پاشبنەما و Pinata تۆماری ئاشکرا وەرناگرن.",
  "IPFS stores encrypted files": "IPFS پەڕگە نهێنیکراوەکان پاشەکەوت دەکات",
  "Encrypted files are pinned to IPFS/Pinata. Blockchain stores only CIDs and permission state.": "پەڕگە نهێنیکراوەکان لە IPFS/Pinata پین دەکرێن. بلۆکچەین تەنها CID و دۆخی مۆڵەت پاشەکەوت دەکات.",
  "Tamper-resistant audit trail": "شوێنەواری پشکنینی دژەدەستکاری",
  "Grant, revoke, institution, and record events are written to Sepolia and shown as audit history.": "ڕووداوەکانی پێدان، وەرگرتنەوە، دامەزراوە و تۆمار لە Sepolia دەنووسرێن و وەک مێژووی پشکنین پیشان دەدرێن.",
  "Revocation limit": "سنووری وەرگرتنەوە",
  "Revocation blocks future authorized access and key sharing. It cannot erase copies already downloaded or decrypted.": "وەرگرتنەوە دەستگەیشتنی مۆڵەتدراوی داهاتوو و هاوبەشکردنی کلیل ڕادەگرێت. ناتوانێت کۆپییە داگرتوو یان کردنەوەکراوەکان بسڕێتەوە.",
  "ML is not diagnosis": "فێربوونی ئامێر دەستنیشانکردنی پزیشکی نییە",
  "The diabetes model is a prototype risk-support tool. It does not replace clinical judgment or lab diagnosis.": "مۆدێلی شەکرە ئامرازێکی نموونەییە بۆ پشتگیری مەترسی. جێگەی بڕیاری کلینیکی یان دەستنیشانکردنی تاقیگە ناگرێتەوە.",
  "No notifications": "هیچ ئاگادارکردنەوەیەک نییە",
  "Updates about access, notes, documents, and membership will appear here.": "نوێکارییەکانی دەستگەیشتن، تێبینی، بەڵگەنامە و ئەندامێتی لێرە دەردەکەون.",
  "Mark notification read": "نیشانکردنی ئاگادارکردنەوە وەک خوێندراوە",
  "Gender": "ڕەگەز",
  "Age": "تەمەن",
  "Hypertension": "بەرزی پەستانی خوێن",
  "Heart disease": "نەخۆشی دڵ",
  "Smoking history": "مێژووی جگەرەکێشان",
  "BMI": "BMI",
  "HbA1c level": "ئاستی HbA1c",
  "Blood glucose level": "ئاستی گلوکۆزی خوێن",
  "Optional": "ئارەزوومەندانە",
  "Female": "مێ",
  "Male": "نێر",
  "Other": "هیتر",
  "No Info": "زانیاری نییە",
  "never": "هەرگیز",
  "current": "ئێستا",
  "former": "پێشوو",
  "ever": "جارێک",
  "not current": "ئێستا نا",
  "No": "نەخێر",
  "Yes": "بەڵێ",
  "Submit": "ناردن",
  "Submitting...": "دەنێردرێت...",
  "Patient wallet": "جزدانی نەخۆش",
  "Record": "تۆمار",
  "Choose a record": "تۆمارێک هەڵبژێرە",
  "Clinical reason": "هۆکاری کلینیکی",
  "Request emergency access": "داواکردنی دەستگەیشتنی فریاکەوتن",
  "Emergency mode": "دۆخی فریاکەوتن",
  "Review status": "دۆخی پێداچوونەوە",
  "Reviewed": "پێداچوونەوە کرا",
  "Follow-up needed": "پەیگیری پێویستە",
  "Urgent": "پەلەدار",
  "Note": "تێبینی",
  "Save note": "پاشەکەوتکردنی تێبینی",
  "Notes History": "مێژووی تێبینییەکان",
  "Documents History": "مێژووی بەڵگەنامەکان",
  "Total": "کۆ",
  "Type": "جۆر",
  "Diagnosis note": "تێبینی دەستنیشانکردن",
  "Lab request": "داواکاری تاقیگە",
  "Referral": "ڕەوانەکردن",
  "Follow-up summary": "پوختەی پەیگیری",
  "Title": "ناونیشان",
  "Content": "ناوەڕۆک",
  "Send to patient": "ناردن بۆ نەخۆش",
  "Message": "پەیام",
  "Choose institution": "دامەزراوە هەڵبژێرە",
  "No available institutions": "هیچ دامەزراوەیەکی بەردەست نییە",
  "Request membership": "داواکردنی ئەندامێتی",
  "Membership History": "مێژووی ئەندامێتی",
  "Diabetic Risk Indicated": "نیشانەی مەترسی شەکرە هەیە",
  "No Diabetic Risk Indicated": "نیشانەی مەترسی شەکرە نییە",
  "Main contributing values": "بەها کاریگەرە سەرەکییەکان",
  "This is not a medical diagnosis.": "ئەمە دەستنیشانکردنی پزیشکی نییە.",
  "Not registered": "تۆمار نەکراوە",
  "Shared records": "تۆمارە هاوبەشکراوەکان",
  "Pending joins": "پەیوەستبوونە چاوەڕوانەکان",
  "Monthly access": "دەستگەیشتنی مانگانە",
  "On-chain ID": "ناسنامەی سەر زنجیرە",
  "Admin": "بەڕێوەبەر",
  "Contract sync needed": "هاوکاتکردنی گرێبەست پێویستە",
  "Register on current contract": "تۆمارکردن لەسەر گرێبەستی ئێستا",
  "Register Institution": "تۆمارکردنی دامەزراوە",
  "Institution Analytics": "ئاماری دامەزراوە",
  "Operational Summary": "پوختەی کار",
  "Records by category": "تۆمارەکان بەپێی پۆل",
  "Doctor wallet address": "ناونیشانی جزدانی پزیشک",
  "Add": "زیادکردن",
  "Doctor Membership Requests": "داواکاری ئەندامێتی پزیشکان",
  "Status": "دۆخ",
  "Records Shared With This Institution": "تۆمارە هاوبەشکراوەکان لەگەڵ ئەم دامەزراوەیە",
  "Doctor Key(s)": "کلیلی پزیشک",
  "Close": "داخستن",
  "Share keys": "هاوبەشکردنی کلیلەکان",
  "Registered institution": "دامەزراوەی تۆمارکراو",
  "Institution Key Envelopes": "پاکەتەکانی کلیلی دامەزراوە",
  "No Accessible Records": "تۆماری دەستپێگەیشتوو نییە",
  "No Patient Workspace Yet": "هێشتا هیچ نەخۆشێک نییە",
  "Patients appear here after they grant you decryptable record access.": "نەخۆشەکان دوای ئەوەی دەستگەیشتنی تۆماری کردنەوەکراوت پێ بدەن لێرە دەردەکەون.",
  "No Emergency-Visible Records": "تۆماری فریاکەوتن نییە",
  "Records patients mark as emergency will appear here.": "ئەو تۆمارانەی نەخۆشان وەک فریاکەوتن نیشانیان دەکەن لێرە دەردەکەون.",
  "No Notes": "هیچ تێبینییەک نییە",
  "No Documents": "هیچ بەڵگەنامەیەک نییە",
  "No Membership History": "مێژووی ئەندامێتی نییە",
  "No Doctor Requests": "داواکاری پزیشک نییە",
  "No Shared Records Yet": "تۆماری هاوبەشکراو نییە",
  "No Audit Events Yet": "ڕووداوی پشکنین نییە",
  "No audit events yet": "ڕووداوی پشکنین نییە",
  "No doctors yet": "هێشتا هیچ پزیشکێک نییە",
  "No shared record categories yet.": "هێشتا هیچ پۆلێکی تۆماری هاوبەشکراو نییە.",
  "No note text provided.": "هیچ دەقی تێبینییەک نەدراوە.",
  "No message provided.": "هیچ پەیامێک نەدراوە."
};

const reverseKu = Object.fromEntries(Object.entries(ku).map(([english, kurdish]) => [kurdish, english]));
const kuPhraseRules = [
  [/\bNew access request\b/g, "داواکاری نوێی دەستگەیشتن"],
  [/\bEmergency access request\b/g, "داواکاری دەستگەیشتنی فریاکەوتن"],
  [/\bAccess request\b/g, "داواکاری دەستگەیشتن"],
  [/\bDoctor membership request\b/g, "داواکاری ئەندامێتی پزیشک"],
  [/\bMembership request\b/g, "داواکاری ئەندامێتی"],
  [/\bEncrypted record key shared\b/g, "کلیلی نهێنیکراوی تۆمار هاوبەش کرا"],
  [/\bEncrypted record key removed\b/g, "کلیلی نهێنیکراوی تۆمار لابرا"],
  [/\bCare document added\b/g, "بەڵگەنامەی چاودێری زیاد کرا"],
  [/\bDoctor note added\b/g, "تێبینی پزیشک زیاد کرا"],
  [/\bPrediction run\b/g, "پێشبینی ئەنجام درا"],
  [/Emergency access request for record #(\d+)/g, "داواکاری دەستگەیشتنی فریاکەوتن بۆ تۆمار #$1"],
  [/Access request for record #(\d+)/g, "داواکاری دەستگەیشتن بۆ تۆمار #$1"],
  [/A doctor requested emergency access for record #(\d+)\./g, "پزیشکێک داوای دەستگەیشتنی فریاکەوتنی بۆ تۆمار #$1 کرد."],
  [/A doctor requested access for record #(\d+)\./g, "پزیشکێک داوای دەستگەیشتنی بۆ تۆمار #$1 کرد."],
  [/An institution requested access for record #(\d+)\./g, "دامەزراوەیەک داوای دەستگەیشتنی بۆ تۆمار #$1 کرد."],
  [/Your request for record #(\d+) was (approved|rejected|pending)\./g, (_match, id, status) => `داواکارییەکەت بۆ تۆمار #${id} ${translateStatus(status, "ku")}.`],
  [/A doctor requested to join (.+)\./g, (_match, name) => `پزیشکێک داوای پەیوەستبوونی بە ${name} کرد.`],
  [/Your request to join (.+) was (approved|rejected|pending)\./g, (_match, name, status) => `داواکارییەکەت بۆ پەیوەستبوون بە ${name} ${translateStatus(status, "ku")}.`],
  [/A key envelope is available for record #(\d+)\./g, "پاکەتی کلیل بۆ تۆمار #$1 بەردەستە."],
  [/Your key envelope for record #(\d+) was removed\./g, "پاکەتی کلیلت بۆ تۆمار #$1 لابرا."],
  [/Record #(\d+) was reviewed\./g, "تۆمار #$1 پێداچوونەوەی بۆ کرا."],
  [/A doctor ran a diabetes prediction with (\d+)% risk probability/g, "پزیشکێک پێشبینی شەکرەی بە ئەگەری مەترسی $1% ئەنجام دا"],
  [/Status: (pending|approved|rejected|reviewed|follow_up|urgent) - key shared: (yes|no)/g, (_match, status, shared) => `دۆخ: ${translateStatus(status, "ku")} - کلیلی هاوبەشکراو: ${shared === "yes" ? "بەڵێ" : "نەخێر"}`],
  [/Status: (pending|approved|rejected|reviewed|follow_up|urgent)/g, (_match, status) => `دۆخ: ${translateStatus(status, "ku")}`],
  [/Category: ([a-z_]+)\s*(Emergency-visible)?/g, (_match, category, emergency) => `پۆل: ${translateCategory(category)}${emergency ? " دیاری فریاکەوتن" : ""}`],
  [/Membership (pending|approved|rejected)/g, (_match, status) => `ئەندامێتی ${translateStatus(status, "ku")}`],
  [/Emergency access (pending|approved|rejected)/g, (_match, status) => `دەستگەیشتنی فریاکەوتن ${translateStatus(status, "ku")}`],
  [/Access (pending|approved|rejected)/g, (_match, status) => `دەستگەیشتن ${translateStatus(status, "ku")}`],
  [/Request (pending|approved|rejected)/g, (_match, status) => `داواکاری ${translateStatus(status, "ku")}`],
  [/Record #(\d+)/g, "تۆمار #$1"],
  [/Institution #(\d+)/g, "دامەزراوە #$1"],
  [/(\d+) record\(s\)/g, "$1 تۆمار"],
  [/(\d+) note\(s\)/g, "$1 تێبینی"],
  [/(\d+) care document\(s\)/g, "$1 بەڵگەنامەی چاودێری"],
  [/(\d+) prediction\(s\)/g, "$1 پێشبینی"],
  [/داواکاری دەستگەیشتنی فریاکەوتن for record #(\d+)/g, "داواکاری دەستگەیشتنی فریاکەوتن بۆ تۆمار #$1"],
  [/داواکاری دەستگەیشتن for record #(\d+)/g, "داواکاری دەستگەیشتن بۆ تۆمار #$1"],
  [/\bReason:/g, "هۆکار:"],
  [/\bis available\./g, "بەردەستە."],
  [/\bfrom\b/g, "لە"],
  [/\bDoctor:\b/g, "پزیشک:"],
  [/\bPatient:\b/g, "نەخۆش:"],
  [/\bBlood:\b/g, "خوێن:"],
  [/\bAllergies:\b/g, "هەستەوەرییەکان:"],
  [/\bConditions:\b/g, "دۆخەکان:"],
  [/\bType:\b/g, "جۆر:"],
  [/\bAdmin:\b/g, "بەڕێوەبەر:"],
  [/\bOn-chain ID:\b/g, "ناسنامەی سەر زنجیرە:"],
  [/\bN\/A\b/g, "نییە"],
  [/\bkey shared yes\b/g, "کلیل هاوبەشکراوە: بەڵێ"],
  [/\bkey shared no\b/g, "کلیل هاوبەشکراوە: نەخێر"],
  [/\bapproved\b/g, "پەسەندکراو"],
  [/\brejected\b/g, "ڕەتکراوە"],
  [/\bpending\b/g, "چاوەڕوان"],
  [/\breviewed\b/g, "پێداچوونەوەکراو"],
  [/\bfollow_up\b/g, "پەیگیری پێویستە"],
  [/\burgent\b/g, "پەلەدار"],
];

const enPhraseRules = [
  [/داواکاری نوێی دەستگەیشتن/g, "New access request"],
  [/داواکاری دەستگەیشتنی فریاکەوتن/g, "Emergency access request"],
  [/داواکاری دەستگەیشتن/g, "Access request"],
  [/داواکاری ئەندامێتی پزیشک/g, "Doctor membership request"],
  [/داواکاری ئەندامێتی/g, "Membership request"],
  [/کلیلی نهێنیکراوی تۆمار هاوبەش کرا/g, "Encrypted record key shared"],
  [/کلیلی نهێنیکراوی تۆمار لابرا/g, "Encrypted record key removed"],
  [/بەڵگەنامەی چاودێری زیاد کرا/g, "Care document added"],
  [/تێبینی پزیشک زیاد کرا/g, "Doctor note added"],
  [/پێشبینی ئەنجام درا/g, "Prediction run"],
  [/تۆمار #(\d+)/g, "Record #$1"],
  [/دامەزراوە #(\d+)/g, "Institution #$1"],
  [/پەسەندکراو/g, "approved"],
  [/ڕەتکراوە/g, "rejected"],
  [/چاوەڕوان/g, "pending"],
  [/پێداچوونەوەکراو/g, "reviewed"],
  [/پەیگیری پێویستە/g, "follow_up"],
  [/پەلەدار/g, "urgent"],
];

const LanguageContext = createContext(null);

function translateStatus(status, language) {
  const kuStatuses = {
    approved: "پەسەندکراوە",
    rejected: "ڕەتکراوەتەوە",
    pending: "چاوەڕوانە",
    reviewed: "پێداچوونەوەکراوە",
    follow_up: "پەیگیری پێویستە",
    urgent: "پەلەدارە",
  };
  if (language === "ku") return kuStatuses[status] || status;
  return status;
}

function translateCategory(category) {
  return {
    lab: "تاقیگە",
    prescription: "ڕەچەتە",
    diagnosis: "دەستنیشانکردن",
    imaging: "وێنەبرداری",
    other: "هیتر",
  }[category] || category;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem(STORAGE_KEY) || "en");

  const setLanguage = useCallback((nextLanguage) => {
    const normalized = nextLanguage === "ku" ? "ku" : "en";
    localStorage.setItem(STORAGE_KEY, normalized);
    setLanguageState(normalized);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "ku" ? "en" : "ku");
  }, [language, setLanguage]);

  const t = useCallback((text) => (language === "ku" ? ku[text] || text : reverseKu[text] || text), [language]);

  useEffect(() => {
    document.documentElement.lang = language === "ku" ? "ckb" : "en";
    document.documentElement.dir = language === "ku" ? "rtl" : "ltr";
    document.documentElement.dataset.language = language;
  }, [language]);

  const value = useMemo(
    () => ({ language, isKurdish: language === "ku", setLanguage, toggleLanguage, t }),
    [language, setLanguage, toggleLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

function translateValue(value, language) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const dictionary = language === "ku" ? ku : reverseKu;
  const translated = dictionary[trimmed];
  if (translated) return value.replace(trimmed, translated);

  const phraseRules = language === "ku" ? kuPhraseRules : enPhraseRules;
  let nextValue = value;
  phraseRules.forEach(([pattern, replacement]) => {
    nextValue = nextValue.replace(pattern, replacement);
  });
  return nextValue;
}

function translateNode(root, language) {
  if (!root || root.nodeType !== Node.ELEMENT_NODE) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    const nextValue = translateValue(node.nodeValue, language);
    if (nextValue !== node.nodeValue) node.nodeValue = nextValue;
  });

  root.querySelectorAll("[placeholder], [aria-label], [title]").forEach((element) => {
    ["placeholder", "aria-label", "title"].forEach((attribute) => {
      const value = element.getAttribute(attribute);
      if (value) {
        const nextValue = translateValue(value, language);
        if (nextValue !== value) element.setAttribute(attribute, nextValue);
      }
    });
  });
}

export function LocalizedPage() {
  const { language } = useLanguage();

  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return undefined;

    translateNode(root, language);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) translateNode(node, language);
            if (node.nodeType === Node.TEXT_NODE) {
              const nextValue = translateValue(node.nodeValue, language);
              if (nextValue !== node.nodeValue) node.nodeValue = nextValue;
            }
          });
        }
        if (mutation.type === "characterData") {
          const nextValue = translateValue(mutation.target.nodeValue, language);
          if (nextValue !== mutation.target.nodeValue) mutation.target.nodeValue = nextValue;
        }
        if (mutation.type === "attributes") {
          const value = mutation.target.getAttribute(mutation.attributeName);
          if (value) {
            const nextValue = translateValue(value, language);
            if (nextValue !== value) mutation.target.setAttribute(mutation.attributeName, nextValue);
          }
        }
      });
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["placeholder", "aria-label", "title"],
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
}
