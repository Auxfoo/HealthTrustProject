import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "healthtrust_language";

const ku = {
  "Toggle language": "گۆڕینی زمان",
  "Toggle dark mode": "گۆڕینی دۆخی تاریک",
  "Log out": "چوونەدەرەوە",
  "Connect": "پەیوەستبوون",
  "Connect MetaMask": "پەیوەستبوون بە MetaMask",
  "Loading profile...": "پرۆفایل بار دەکرێت...",
  "ML": "ML",
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
  "hospital": "نەخۆشخانە",
  "clinic": "کلینیک",
  "Save Profile": "پاشەکەوتکردنی پرۆفایل",
  "Save profile": "پاشەکەوتکردنی پرۆفایل",
  "Waiting for MetaMask...": "چاوەڕوانی MetaMask...",
  "Select": "هەڵبژاردن",
  "Care Documents": "بەڵگەنامەی چاودێری",
  "Doctor Notes": "تێبینییەکانی پزیشک",
  "Unable to load records": "نەتوانرا تۆمارەکان بار بکرێن",
  "Patient Workspace": "داشبۆردی نەخۆش",
  "Doctor Workspace": "داشبۆردی پزیشک",
  "Institution Workspace": "داشبۆردی دامەزراوە",
  "Records and Access": "تۆمار و دەستگەیشتن",
  "Clinical Review": "پێداچوونەوەی پزیشکی",
  "Care Review": "پێداچوونەوەی چاودێری",
  "Organization Access": "دەستگەیشتنی دامەزراوە",
  "Low Risk": "مەترسی کەم",
  "Medium Risk": "مەترسی مامناوەند",
  "High Risk": "مەترسی بەرز",
  "Emergency mode": "دۆخی فریاکەوتن",
  "Choose a record the patient marked emergency-visible. This sends a clearly labeled request and notification; the patient still controls final on-chain access and encrypted key sharing.": "تۆمارێک هەڵبژێرە کە نەخۆش وەک بینراوی فریاکەوتن نیشانی کردووە. ئەمە داواکارییەک و ئاگادارکردنەوەیەکی ڕوون دەنێرێت؛ نەخۆش هێشتا کۆنتڕۆڵی کۆتایی دەستگەیشتنی سەر زنجیرە و هاوبەشکردنی کلیلی نهێنیکراوی هەیە.",
  "Patient Consent Summary": "پوختەی ڕەزامەندیی نەخۆش",
  "Institution Analytics": "شیکاری دامەزراوە",
  "Operational Summary": "پوختەی کارگێڕی",
  "Records by category": "تۆمارەکان بەپێی پۆل",
  "Doctor Membership Requests": "داواکارییەکانی ئەندامێتی پزیشک",
  "Contract sync needed": "هاوکاتکردنی کۆنتڕاکت پێویستە",
  "This usually happens after redeploying the smart contract. Register this institution again on the current contract to get a new on-chain ID for this wallet.": "ئەمە زۆرجار دوای دووبارە بڵاوکردنەوەی کۆنتڕاکتە زیرەکەکە ڕوودەدات. ئەم دامەزراوەیە دووبارە لە کۆنتڕاکتی ئێستادا تۆمار بکە بۆ بەدەستهێنانی ناسنامەی نوێی سەر زنجیرە بۆ ئەم جزدانە.",
  "Register on current contract": "تۆمارکردن لە کۆنتڕاکتی ئێستادا",
  "Register Institution": "تۆمارکردنی دامەزراوە",
  "Choose emergency record": "تۆماری فریاکەوتن هەڵبژێرە",
  "Clinical reason": "هۆکاری کلینیکی",
  "Request emergency access": "داواکردنی دەستگەیشتنی فریاکەوتن",
  "Not registered": "تۆمارنەکراوە",
  "Records": "تۆمارەکان",
  "Requests": "داواکارییەکان",
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
  "Latest risk": "دوا مەترسی",
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
  "lab": "تاقیگە",
  "Prescription": "ڕەچەتە",
  "prescription": "ڕەچەتە",
  "Diagnosis": "دەستنیشانکردن",
  "diagnosis": "دەستنیشانکردن",
  "Imaging": "وێنەبرداری",
  "imaging": "وێنەبرداری",
  "Other": "هیتر",
  "other": "هیتر",
  "All flags": "هەموو نیشانەکان",
  "Important": "گرنگ",
  "No archived records": "هیچ تۆمارێکی ئەرشیفکراو نییە",
  "No records found": "هیچ تۆمارێک نەدۆزرایەوە",
  "Records you archive will appear here.": "ئەو تۆمارانەی ئەرشیفیان دەکەیت لێرە دەردەکەون.",
  "No records match your search.": "هیچ تۆمارێک لەگەڵ گەڕانەکەت ناگونجێت.",
  "Uploaded records will appear here.": "تۆمارە بارکراوەکان لێرە دەردەکەون.",
  "Manage": "بەڕێوەبردن",
  "View": "بینین",
  "View tx": "بینینی مامەڵە",
  "PDF": "PDF",
  "Grant": "پێدان",
  "Revoke": "وەرگرتنەوە",
  "Approve": "پەسەندکردن",
  "Reject": "ڕەتکردنەوە",
  "Complete grant": "تەواوکردنی پێدان",
  "Access Requests": "داواکاری دەستگەیشتن",
  "No Access Requests": "هیچ داواکارییەکی دەستگەیشتن نییە",
  "Doctor and emergency access requests will appear here.": "داواکارییەکانی پزیشک و فریاکەوتن لێرە دەردەکەون.",
  "Documents sent by doctors will appear here.": "ئەو بەڵگەنامانەی پزیشکان دەنێرن لێرە دەردەکەون.",
  "Notes added by doctors will appear here.": "ئەو تێبینییانەی پزیشکان زیاد دەکەن لێرە دەردەکەون.",
  "Access grants, revokes, and patient-created records will appear here.": "پێدانی دەستگەیشتن، وەرگرتنەوە و تۆمارە دروستکراوەکانی نەخۆش لێرە دەردەکەون.",
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
  "Files are encrypted in the browser before upload. The backend and Pinata do not receive plaintext records.": "پەڕگەکان پێش بارکردن لە وێبگەڕدا نهێنی دەکرێن. بەکئێند و Pinata تۆماری ئاشکرا وەرناگرن.",
  "IPFS stores encrypted files": "IPFS پەڕگە نهێنیکراوەکان پاشەکەوت دەکات",
  "Encrypted files are pinned to IPFS/Pinata. Blockchain stores only CIDs and permission state.": "پەڕگە نهێنیکراوەکان لە IPFS/Pinata پین دەکرێن. بلۆکچەین تەنها CID و دۆخی مۆڵەت پاشەکەوت دەکات.",
  "Tamper-resistant audit trail": "شوێنەواری پشکنینی دژەدەستکاری",
  "Grant, revoke, institution, and record events are written to Sepolia and shown as audit history.": "ڕووداوەکانی پێدان، وەرگرتنەوە، دامەزراوە و تۆمار لە Sepolia دەنووسرێن و وەک مێژووی پشکنین پیشان دەدرێن.",
  "Revocation limit": "سنووری وەرگرتنەوە",
  "Revocation blocks future authorized access and key sharing. It cannot erase copies already downloaded or decrypted.": "وەرگرتنەوە دەستگەیشتنی مۆڵەتدراوی داهاتوو و هاوبەشکردنی کلیل ڕادەگرێت. ناتوانێت کۆپییە داگرتوو یان کردنەوەکراوەکان بسڕێتەوە.",
  "ML is not diagnosis": "ئێم ئێل دەستنیشانکردنی پزیشکی نییە",
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
  "Emergency-visible record": "تۆماری دیاری فریاکەوتن",
  "Choose emergency record": "تۆماری فریاکەوتن هەڵبژێرە",
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
  "Not run": "ئەنجام نەدراوە",
  "No patient linked": "هیچ نەخۆشێک پەیوەست نییە",
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
  "N/A": "نییە",
  "Reviewed": "پێداچوونەوە کرا",
  "Pending": "چاوەڕوان",
  "Approved": "پەسەندکراو",
  "Rejected": "ڕەتکراوە",
  "Urgent": "پەلەدار",
  "Follow Up": "پەیگیری",
  "Lab Request": "داواکاری تاقیگە",
  "Diagnosis Note": "تێبینی دەستنیشانکردن",
  "Records Shared With This Institution": "تۆمارە هاوبەشکراوەکان لەگەڵ ئەم دامەزراوەیە",
  "Doctor Key(s)": "کلیلی پزیشک",
  "Close": "داخستن",
  "Refresh records": "نوێکردنەوەی تۆمارەکان",
  "Refresh institution": "نوێکردنەوەی دامەزراوە",
  "Pending timestamp": "کاتی چاوەڕوان",
  "Record ID": "ناسنامەی تۆمار",
  "CID": "CID",
  "Copy CID": "لەبەرگرتنەوەی CID",
  "Copy wallet": "لەبەرگرتنەوەی جزدان",
  "Resend key": "ناردنەوەی کلیل",
  "Wallet copied": "جزدان لەبەرگیرا",
  "CID copied": "CID لەبەرگیرا",
  "Share keys": "هاوبەشکردنی کلیلەکان",
  "Registered institution": "دامەزراوەی تۆمارکراو",
  "Institution Key Envelopes": "پاکەتەکانی کلیلی دامەزراوە",
  "Doctors With Key Envelopes": "پزیشکانی خاوەن پاکەتی کلیل",
  "No doctors shared yet": "هێشتا هیچ پزیشکێک هاوبەش نەکراوە",
  "Doctor key envelopes will appear here after access is granted.": "پاکەتەکانی کلیلی پزیشک دوای پێدانی دەستگەیشتن لێرە دەردەکەون.",
  "No Institution Sharing Yet": "هێشتا هیچ هاوبەشکردنی دامەزراوە نییە",
  "Institution doctor key envelopes will appear here after access is granted.": "پاکەتەکانی کلیلی پزیشکانی دامەزراوە دوای پێدانی دەستگەیشتن لێرە دەردەکەون.",
  "No institutions available": "هیچ دامەزراوەیەک بەردەست نییە",
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
  "Approved or manually added doctors will appear here.": "پزیشکە پەسەندکراوەکان یان ئەوانەی دەستی زیاد کراون لێرە دەردەکەون.",
  "New doctor membership requests will appear here.": "داواکارییە نوێیەکانی ئەندامێتی پزیشک لێرە دەردەکەون.",
  "Records granted to this institution will appear here.": "ئەو تۆمارانەی بۆ ئەم دامەزراوەیە پێدراون لێرە دەردەکەون.",
  "Institutions with pending or approved requests are hidden from this list.": "دامەزراوەکانی خاوەن داواکاری چاوەڕوان یان پەسەندکراو لەم لیستەدا شاراوەن.",
  "No shared record categories yet.": "هێشتا هیچ پۆلێکی تۆماری هاوبەشکراو نییە.",
  "No note text provided.": "هیچ دەقی تێبینییەک نەدراوە.",
  "No message provided.": "هیچ پەیامێک نەدراوە.",
  "HbA1c is in a high range.": "ئاستی HbA1c لە مەودای بەرزدایە.",
  "Blood glucose is elevated.": "گلوکۆزی خوێن بەرزە.",
  "BMI is in an obesity range.": "BMI لە مەودای قەڵەویدایە.",
  "Age increases diabetes risk in the model.": "تەمەن لە مۆدێلەکەدا مەترسی شەکرە زیاد دەکات.",
  "Hypertension is present.": "بەرزی پەستانی خوێن هەیە.",
  "Heart disease is present.": "نەخۆشی دڵ هەیە.",
  "No single high-risk input stands out; the result comes from the combined model features.": "هیچ بەهایەکی تاکی پڕمەترسی دیار نییە؛ ئەنجامەکە لە کۆی تایبەتمەندییەکانی مۆدێلەکەوە دێت.",
  "Notes you add for accessible records will appear here.": "ئەو تێبینییانەی بۆ تۆمارە دەستپێگەیشتووەکان زیاد دەکەیت لێرە دەردەکەون.",
  "Care documents you send to patients will appear here.": "ئەو بەڵگەنامانەی بۆ نەخۆشان دەنێریت لێرە دەردەکەون.",
  "Your institution join requests will appear here.": "داواکارییەکانی پەیوەستبوون بە دامەزراوەت لێرە دەردەکەون.",
  "Diabetes prediction results will appear here after you submit the form.": "ئەنجامی پێشبینی شەکرە دوای ناردنی فۆرمەکە لێرە دەردەکەوێت.",
  "Membership, access requests, notes, documents, and predictions will appear here.": "ئەندامێتی، داواکاری دەستگەیشتن، تێبینی، بەڵگەنامە و پێشبینییەکان لێرە دەردەکەون.",
  "Membership, shared record, and encrypted key events will appear here.": "ڕووداوەکانی ئەندامێتی، تۆماری هاوبەشکراو و کلیلی نهێنیکراو لێرە دەردەکەون.",
  "bloodType": "جۆری خوێن",
  "allergies": "هەستەوەرییەکان",
  "chronicConditions": "نەخۆشییە درێژخایەنەکان",
  "emergencyContact": "پەیوەندی فریاکەوتن",
  "Accessible Records": "تۆمارە دەستپێگەیشتووەکان",
  "Refresh records": "نوێکردنەوەی تۆمارەکان",
  "Refresh accessible records": "نوێکردنەوەی تۆمارە دەستپێگەیشتووەکان",
  "Refresh service status": "نوێکردنەوەی دۆخی خزمەتگوزاری",
  "Copy doctor wallet": "لەبەرگرتنەوەی جزدانی پزیشک",
  "Remove doctor": "لابردنی پزیشک",
  "Encrypting record...": "تۆمار نهێنیدەکرێت...",
  "Pinning encrypted file to IPFS...": "پەڕگەی نهێنیکراو لە IPFS پیندەکرێت...",
  "Confirming record on-chain...": "تۆمار لەسەر زنجیرە دەیسەلمێنرێت...",
  "Record uploaded": "تۆمار بارکرا",
  "Upload stopped": "بارکردن وەستا",
  "Upload failed": "بارکردن سەرکەوتوو نەبوو",
  "Medical profile saved": "پرۆفایلی پزیشکی پاشەکەوت کرا",
  "Unable to save profile": "نەتوانرا پرۆفایل پاشەکەوت بکرێت",
  "Access granted and key shared": "دەستگەیشتن پێدرا و کلیل هاوبەش کرا",
  "Unable to update request": "نەتوانرا داواکاری نوێ بکرێتەوە",
  "Fetching encrypted record...": "پەڕگەی نهێنیکراو دەهێنرێت...",
  "Record decrypted": "تۆمار کرایەوە",
  "Wrong AES key, or unsupported file type.": "کلیلی AES هەڵە یان جۆری پەڕگەی پشتگیری نەکراو.",
  "Prediction form auto-filled from PDF": "فۆرمی پێشبینی لە PDF خۆکارانە پڕکرا",
  "No available institution to request": "هیچ دامەزراوەیەکی بەردەست نییە بۆ داواکردن",
  "Membership request sent": "داواکاری ئەندامێتی نێردرا",
  "Unable to send membership request": "نەتوانرا داواکاری ئەندامێتی بنێردرێت",
  "Record ID and emergency reason are required": "ناسنامەی تۆمار و هۆکاری فریاکەوتن پێویستن",
  "Emergency access request sent": "داواکاری دەستگەیشتنی فریاکەوتن نێردرا",
  "Unable to request emergency access": "نەتوانرا داوای دەستگەیشتنی فریاکەوتن بکرێت",
  "Choose an accessible record": "تۆمارێکی دەستپێگەیشتوو هەڵبژێرە",
  "Note saved": "تێبینی پاشەکەوت کرا",
  "Unable to save note": "نەتوانرا تێبینی پاشەکەوت بکرێت",
  "Creating care document...": "دروستکردنی بەڵگەنامەی چاودێری...",
  "Care document sent": "بەڵگەنامەی چاودێری نێردرا",
  "Registering institution...": "دامەزراوە تۆمار دەکرێت...",
  "Institution registered": "دامەزراوە تۆمارکرا",
  "Register an institution first": "سەرەتا دامەزراوەیەک تۆمار بکە",
  "Registering institution on-chain...": "دامەزراوە لەسەر زنجیرە تۆمار دەکرێت...",
  "Adding doctor...": "پزیشک زیاد دەکرێت...",
  "Doctor added": "پزیشک زیاد کرا",
  "Removing doctor...": "پزیشک لادەبرێت...",
  "Doctor removed": "پزیشک لابرا",
  "Membership approved": "ئەندامێتی پەسەندکرا",
  "Membership rejected": "ئەندامێتی ڕەتکرایەوە",
  "Unable to mark membership approved": "نەتوانرا ئەندامێتی وەک پەسەندکراو نیشان بکرێت",
  "Unable to mark membership rejected": "نەتوانرا ئەندامێتی وەک ڕەتکراوە نیشان بکرێت",
  "Unable to load institutions": "نەتوانرا دامەزراوەکان بار بکرێن",
  "Unable to load membership requests": "نەتوانرا داواکارییەکانی ئەندامێتی بار بکرێن",
  "Dashboard refresh failed. Modal data was refreshed.": "نوێکردنەوەی داشبۆرد سەرکەوتوو نەبوو. داتای مۆدال نوێ کرایەوە.",
  "Confirm the transaction in MetaMask.": "مامەڵە لە MetaMask دەستنیشان بکە.",
  "Transaction submitted": "مامەڵە نێردرا",
  "Waiting for Sepolia confirmation.": "چاوەڕوانی سەلمێنردنی Sepolia.",
  "Updating access list": "لیستی دەستگەیشتن نوێ دەکرێتەوە",
  "Saving key envelope changes and refreshing this modal.": "گۆڕانکارییەکانی پاکەتی کلیل پاشەکەوت دەکرێن و ئەم مۆدالە نوێ دەکرێتەوە.",
  "The access list below is up to date.": "لیستی دەستگەیشتنی خوارەوە نوێیە.",
  "Access update failed": "نوێکردنەوەی دەستگەیشتن سەرکەوتوو نەبوو",
  "AES key is not available in this browser. Re-upload or paste the key first.": "کلیلی AES لەم وێبگەڕەدا بەردەست نییە. سەرەتا تۆمار بکەرەوە یان کلیل دابنێ.",
  "Granting doctor access...": "دەستگەیشتنی پزیشک پێدەدرێت...",
  "Doctor access granted": "دەستگەیشتنی پزیشک پێدرا",
  "Revoking doctor access...": "دەستگەیشتنی پزیشک وەردەگیرێتەوە...",
  "Doctor access revoked": "دەستگەیشتنی پزیشک وەرگیرایەوە",
  "Sharing institution keys...": "کلیلەکانی دامەزراوە هاوبەش دەکرێن...",
  "Institution keys shared": "کلیلەکانی دامەزراوە هاوبەش کران",
  "Revoking institution access...": "دەستگەیشتنی دامەزراوە وەردەگیرێتەوە...",
  "Institution access revoked": "دەستگەیشتنی دامەزراوە وەرگیرایەوە",
  "Resending key...": "کلیل دەنێردرێتەوە...",
  "Key resent": "کلیل نێردرایەوە",
  "Unable to resend key": "نەتوانرا کلیل بنێردرێتەوە",
  "Profile saved without encryption public key. Secure key sharing will be limited until you register it.": "پرۆفایل بەبێ کلیلی گشتیی نهێنیکردن پاشەکەوت کرا. هاوبەشکردنی کلیلی پارێزراو سنووردار دەبێت هەتا تۆماری بکەیت.",
  "Institution membership request sent": "داواکاری ئەندامێتی دامەزراوە نێردرا",
  "Profile saved, but membership request failed": "پرۆفایل پاشەکەوت کرا، بەڵام داواکاری ئەندامێتی سەرکەوتوو نەبوو",
  "Profile saved": "پرۆفایل پاشەکەوت کرا",
  "Connect": "پەیوەستبوون",
  "Connect MetaMask": "پەیوەستبوون بە MetaMask",
  "Loading profile...": "پرۆفایل بار دەکرێت...",
  "Follow-up summary": "پوختەی پەیگیری"
};

const reverseKu = Object.fromEntries(Object.entries(ku).map(([english, kurdish]) => [kurdish, english]));
const kuDigits = {
  0: "٠",
  1: "١",
  2: "٢",
  3: "٣",
  4: "٤",
  5: "٥",
  6: "٦",
  7: "٧",
  8: "٨",
  9: "٩",
};

function toKurdishDigits(value) {
  return String(value).replace(/\d/g, (digit) => kuDigits[digit] || digit);
}

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
  [/Doctor note saved/g, "تێبینی پزیشک پاشەکەوت کرا"],
  [/Care document sent/g, "بەڵگەنامەی چاودێری نێردرا"],
  [/Diabetes prediction run/g, "پێشبینی شەکرە ئەنجام درا"],
  [/AccessGrantedToDoctor/g, "دەستگەیشتن بۆ پزیشک پێدرا"],
  [/AccessRevokedFromDoctor/g, "دەستگەیشتنی پزیشک وەرگیرایەوە"],
  [/AccessGrantedToInstitution/g, "دەستگەیشتن بۆ دامەزراوە پێدرا"],
  [/AccessRevokedFromInstitution/g, "دەستگەیشتنی دامەزراوە وەرگیرایەوە"],
  [/RecordAddedForPatient/g, "تۆمار بۆ نەخۆش زیاد کرا"],
  [/DoctorNoteAdded/g, "تێبینی پزیشک زیاد کرا"],
  [/CareDocumentAdded/g, "بەڵگەنامەی چاودێری زیاد کرا"],
  [/DoctorAddedToInstitution/g, "پزیشک بۆ دامەزراوە زیاد کرا"],
  [/DoctorRemovedFromInstitution/g, "پزیشک لە دامەزراوە لابرا"],
  [/Notification:/g, "ئاگادارکردنەوە:"],
  [/Doctor key envelope available/g, "پاکەتی کلیلی پزیشک بەردەستە"],
  [/Doctor currently registered/g, "پزیشک لە ئێستادا تۆمارکراوە"],
  [/Record ID: (\d+)/g, "ناسنامەی تۆمار: $1"],
  [/Category: ([a-z_]+)\s*(Emergency-visible)?/g, (_match, category, emergency) => `پۆل: ${translateCategory(category)}${emergency ? " دیاری فریاکەوتن" : ""}`],
  [/(\d+) active encrypted key envelope\(s\)/g, "$1 پاکەتی کلیلی نهێنیکراوی کارا"],
  [/(\d+) registered doctor\(s\)/g, "$1 پزیشکی تۆمارکراو"],
  [/(\d+) active shared record\(s\)/g, "$1 تۆماری هاوبەشکراوی کارا"],
  [/(\d+) pending membership request\(s\)/g, "$1 داواکاری ئەندامێتی چاوەڕوان"],
  [/(\d+) encrypted key event\(s\) this month/g, "$1 ڕووداوی کلیلی نهێنیکراو لەم مانگەدا"],
  [/(\d+) encrypted key event\(s\)/g, "$1 ڕووداوی کلیلی نهێنیکراو"],
  [/(\d+)% risk/g, "مەترسی $1%"],
  [/Institution #(\d+) doctor/g, "پزیشکی دامەزراوە #$1"],
  [/Doctor wallet copied/g, "جزدانی پزیشک لەبەرگیرا"],
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
  [/\blab\b/g, "تاقیگە"],
  [/\bprescription\b/g, "ڕەچەتە"],
  [/\bdiagnosis\b/g, "دەستنیشانکردن"],
  [/\blab_request\b/g, "داواکاری تاقیگە"],
  [/\breferral\b/g, "ڕەوانەکردن"],
  [/\bDoctor:\b/g, "پزیشک:"],
  [/\bPatient:\b/g, "نەخۆش:"],
  [/\bBlood:\b/g, "خوێن:"],
  [/\bAllergies:\b/g, "هەستەوەرییەکان:"],
  [/\bConditions:\b/g, "دۆخەکان:"],
  [/\bType:\b/g, "جۆر:"],
  [/\bAdmin:\b/g, "بەڕێوەبەر:"],
  [/\bOn-chain ID:\b/g, "ناسنامەی سەر زنجیرە:"],
  [/\bN\/A\b/g, "نییە"],
  [/\bAM\b/g, "پ.ن"],
  [/\bPM\b/g, "د.ن"],
  [/\bSunday\b/g, "یەکشەممە"],
  [/\bMonday\b/g, "دووشەممە"],
  [/\bTuesday\b/g, "سێشەممە"],
  [/\bWednesday\b/g, "چوارشەممە"],
  [/\bThursday\b/g, "پێنجشەممە"],
  [/\bFriday\b/g, "هەینی"],
  [/\bSaturday\b/g, "شەممە"],
  [/\bJanuary\b/g, "کانوونی دووەم"],
  [/\bFebruary\b/g, "شوبات"],
  [/\bMarch\b/g, "ئازار"],
  [/\bApril\b/g, "نیسان"],
  [/\bMay\b/g, "ئایار"],
  [/\bJune\b/g, "حوزەیران"],
  [/\bJuly\b/g, "تەممووز"],
  [/\bAugust\b/g, "ئاب"],
  [/\bSeptember\b/g, "ئەیلوول"],
  [/\bOctober\b/g, "تشرینی یەکەم"],
  [/\bNovember\b/g, "تشرینی دووەم"],
  [/\bDecember\b/g, "کانوونی یەکەم"],
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

  const localizeText = useCallback(
    (text) => {
      if (text === null || text === undefined) return text;
      const value = String(text);
      return translateValue(value, language === "ku" ? "ku" : "en");
    },
    [language]
  );

  const t = useCallback(
    (text) => {
      const dictionary = language === "ku" ? ku : reverseKu;
      const translated = dictionary[text];
      if (translated === undefined) return text;
      return language === "ku" ? toKurdishDigits(translated) : translated;
    },
    [language]
  );

  const formatNumber = useCallback(
    (value) => (language === "ku" ? toKurdishDigits(value) : String(value)),
    [language]
  );

  const formatDate = useCallback(
    (value, options) => {
      if (!value) return "";
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return localizeText(value);
      const formatted = date.toLocaleString(language === "ku" ? "ckb-IQ" : undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        ...options,
      });
      return language === "ku" ? toKurdishDigits(translateValue(formatted, "ku")) : formatted;
    },
    [language, localizeText]
  );

  useEffect(() => {
    document.documentElement.lang = language === "ku" ? "ckb" : "en";
    document.documentElement.dir = language === "ku" ? "rtl" : "ltr";
    document.documentElement.dataset.language = language;
  }, [language]);

  const value = useMemo(
    () => ({ language, isKurdish: language === "ku", setLanguage, toggleLanguage, t, localizeText, formatDate, formatNumber }),
    [language, setLanguage, toggleLanguage, t, localizeText, formatDate, formatNumber]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

function looksLikeIdentifier(value) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Ethereum addresses, tx hashes, and other 0x-prefixed hex strings.
  if (/^0x[a-fA-F0-9]{6,}$/.test(trimmed)) return true;
  // IPFS CIDs (v0 starts with Qm, v1 starts with bafy/bafk/etc.).
  if (/^Qm[1-9A-HJ-NP-Za-km-z]{20,}$/.test(trimmed)) return true;
  if (/^baf[a-z0-9]{20,}$/.test(trimmed)) return true;
  // Long hex strings (typically hashes) without the 0x prefix.
  if (/^[a-fA-F0-9]{40,}$/.test(trimmed)) return true;
  return false;
}

function translateValue(value, language) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (looksLikeIdentifier(value)) return value;
  const dictionary = language === "ku" ? ku : reverseKu;
  const translated = dictionary[trimmed];
  if (translated) {
    const replaced = value.replace(trimmed, translated);
    return language === "ku" ? toKurdishDigits(replaced) : replaced;
  }

  const phraseRules = language === "ku" ? kuPhraseRules : enPhraseRules;
  let nextValue = value;
  let changed = false;
  phraseRules.forEach(([pattern, replacement]) => {
    const replaced = nextValue.replace(pattern, replacement);
    if (replaced !== nextValue) {
      nextValue = replaced;
      changed = true;
    }
  });
  if (!changed) return value;
  return language === "ku" ? toKurdishDigits(nextValue) : nextValue;
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
