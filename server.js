require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const mailjet = require('node-mailjet');
const Groq = require('groq-sdk');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');

// Import models
const Trainer = require('./models/Trainer');
const Member = require('./models/Member');
const Product = require('./models/Product');
const DietPlan = require('./models/DietPlan');
const WorkoutPlan = require('./models/WorkoutPlan');
const Membership = require('./models/Membership');
const LegalContent = require('./models/LegalContent');
const ContactInfo = require('./models/ContactInfo');
const StaffTrainer = require('./models/StaffTrainer');
const Admin = require('./models/Admin');
const Payment = require('./models/Payment');
const Attendance = require('./models/Attendance');
const MemberWeight = require('./models/MemberWeight');
const MemberPR = require('./models/MemberPR');

// Import routes
const trainerRoutes = require('./routes/trainers');
const memberRoutes = require('./routes/members');
const productRoutes = require('./routes/products');
const siteSettingsRoutes = require('./routes/siteSettings');
const statsRoutes = require('./routes/stats');
const transformationRoutes = require('./routes/transformations');
const dietPlanRoutes = require('./routes/dietPlans');
const workoutPlanRoutes = require('./routes/workoutPlans');
const membershipRoutes = require('./routes/memberships');
const galleryRoutes = require('./routes/gallery');
const reelRoutes = require('./routes/reels');
const reviewRoutes = require('./routes/reviews');
const contactInfoRoutes = require('./routes/contactInfo');
const dietCategoriesRoutes = require('./routes/dietCategories');
const dietMealsRoutes = require('./routes/dietMeals');
const workoutCategoriesRoutes = require('./routes/workoutCategories');
const workoutDaysRoutes = require('./routes/workoutDays');
const legalRoutes = require('./routes/legal');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');

// Trainer authentication & panel routes
const trainerAuthRoutes = require('./routes/trainerAuth');
const trainerPanelRoutes = require('./routes/trainerPanel');

// Admin panel routes
const adminPanelRoutes = require('./routes/adminPanel');

// Member auth & member panel routes
const memberAuthRoutes = require('./routes/memberAuthRoutes');
const memberSelfRoutes = require('./routes/memberRoutes');

// ✅ Public members list (no authentication)
const publicMemberRoutes = require('./routes/publicMember');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CORS & JSON ==========
const corsOptions = {
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());

// ========== STATIC FILES & UPLOADS ==========
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use(express.static('public'));

// ========== PUBLIC UPLOAD FOR SIGNUP ==========
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/api/upload-signup', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// ========== PUBLIC ROUTES (NO AUTHENTICATION REQUIRED) ==========
// These must be placed BEFORE any protected routes or auth middleware
app.use('/api/sitesettings', siteSettingsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/members-list', publicMemberRoutes);

// ========== FREE TRIAL BOOKING (also public) ==========
const sendEmail = async (toEmail, toName, subject, htmlContent) => {
  try {
    await mailjet
      .apiConnect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE)
      .post("send", { version: 'v3.1' })
      .request({
        "Messages": [
          {
            "From": {
              "Email": process.env.MJ_FROM_EMAIL || "your-verified-email@example.com",
              "Name": process.env.MJ_FROM_NAME || "UltraFit Gym"
            },
            "To": [{ "Email": toEmail, "Name": toName }],
            "Subject": subject,
            "HTMLPart": htmlContent
          }
        ]
      });
    console.log(`✅ Email sent to ${toEmail}`);
    return true;
  } catch (err) {
    console.error(`❌ Mailjet error: ${err.statusCode} - ${err.message}`);
    return false;
  }
};

app.post('/api/book-trial', async (req, res) => {
  const { name, phone, email } = req.body;
  if (!name || !phone || !email) {
    return res.status(400).json({ message: 'Please provide name, phone number, and email address.' });
  }
  const adminEmailContent = `
    <h2>🎟️ New Free Trial Booking</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Phone:</strong> ${phone}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p>Please contact the member to schedule their one-day free trial.</p>
    <hr />
    <p><em>UltraFit Gym Automated Notification</em></p>
  `;
  const userEmailContent = `
    <div style="font-family: 'Montserrat', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #121212; color: #eaeaea; border-radius: 20px; border: 1px solid #FFD700;">
      <h2 style="color: #FFD700; text-align: center;">🎉 You're Almost There!</h2>
      <p>Dear <strong>${name}</strong>,</p>
      <p>Thank you for booking a <strong>one-day free trial</strong> at <strong>UltraFit Gym</strong>.</p>
      <p>We have received your request and our team will contact you shortly at <strong>${phone}</strong> to confirm your trial slot and answer any questions.</p>
      <p>If you have any immediate questions, please reply to this email or call us directly.</p>
      <br/>
      <p style="text-align: center;">💪 Get ready to transform your fitness journey!</p>
      <hr style="border-color: #FFD700;" />
      <p style="font-size: 12px; text-align: center;">UltraFit Gym – Where champions are made.</p>
    </div>
  `;
  const adminEmailSent = await sendEmail(process.env.ADMIN_EMAIL || 'admin@example.com', 'UltraFit Admin', 'New Free Trial Booking', adminEmailContent);
  const userEmailSent = await sendEmail(email, name, 'Your Free Trial Confirmation – UltraFit Gym', userEmailContent);
  if (adminEmailSent && userEmailSent) {
    res.status(200).json({ success: true, message: 'Trial booked successfully! Check your email for confirmation.' });
  } else if (adminEmailSent && !userEmailSent) {
    res.status(200).json({ success: true, message: 'Trial booked, but confirmation email could not be sent. Please contact us directly.' });
  } else {
    res.status(500).json({ success: false, message: 'Failed to send booking emails. Please try again or contact us directly.' });
  }
});

// ========== GROQ CHATBOT (ROLE‑AWARE) ==========
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getWebsiteDataForAI() {
  const memberships = await Membership.find().lean();
  const members = await Member.find().lean();
  const products = await Product.find().lean().limit(30);
  const dietPlans = await DietPlan.find().lean();
  const workoutPlans = await WorkoutPlan.find().lean();
  const trainers = await Trainer.find().lean();
  const contact = await ContactInfo.findOne().lean();
  const legalDocs = await LegalContent.find().lean();

  const privacyDoc = legalDocs.find(d => d.pageKey === 'privacy');
  const refundDoc = legalDocs.find(d => d.pageKey === 'refund');
  const termsDoc = legalDocs.find(d => d.pageKey === 'terms');

  const getLegalSummary = (doc) => {
    if (!doc || !doc.sections || doc.sections.length === 0) return null;
    const firstSection = doc.sections[0];
    let summary = firstSection.content;
    if (summary.length > 500) summary = summary.substring(0, 500) + '...';
    return summary;
  };

  const privacySummary = getLegalSummary(privacyDoc) || 'Privacy policy available on privacy.html.';
  const refundSummary = getLegalSummary(refundDoc) || 'Refund policy available on refund.html.';
  const termsSummary = getLegalSummary(termsDoc) || 'Terms & conditions available on terms.html.';

  const activeMembers = members.filter(m => m.status === 'active').length;
  const inactiveMembers = members.filter(m => m.status === 'inactive').length;

  const trainersStr = trainers.map(t => 
    `- ${t.name} (${t.position}): WhatsApp ${t.whatsappNumber || 'N/A'}, Instagram: ${t.instagramUrl || 'N/A'}, Bio: ${t.bio || 'No bio'}`
  ).join('\n');

  const membershipStr = memberships.map(m => `- ${m.planName}: ₹${m.price} / ${m.duration} (${m.description || ''})`).join('\n');
  const productsStr = products.map(p => `- ${p.name}: ₹${p.price} | Tags: ${(p.tags || []).join(', ')} | ${p.shortDescription || ''}`).join('\n');
  const dietStr = dietPlans.map(d => `- ${d.title}: ${d.shortDescription} | Targets: ${(d.targets || []).join(', ')}`).join('\n');
  const workoutStr = workoutPlans.map(w => `- ${w.title}: ${w.shortDescription} | Targets: ${(w.targets || []).join(', ')}`).join('\n');

  let contactStr = 'Contact details not available.';
  if (contact) {
    contactStr = `Phone: ${contact.phone || 'N/A'}, WhatsApp: ${contact.whatsappNumber || 'N/A'}, Email: ${contact.email || 'N/A'}, Address: ${contact.address || 'N/A'}`;
  }

  const trialProcess = `To book a 3-day free trial, click the "Book 3-Day Free Trial" button on any page, or the "Claim Your 3-Day VIP Pass" button on the homepage. Fill in your full name, phone number, and email address. You will receive a confirmation email and our team will call you to schedule your trial slot. The trial includes full access to gym facilities and one free personal training session.`;

  return {
    membershipStr,
    membersCount: members.length,
    activeMembers,
    inactiveMembers,
    productsStr,
    dietStr,
    workoutStr,
    trainersStr,
    contactStr,
    trialProcess,
    privacySummary,
    refundSummary,
    termsSummary
  };
}

app.post('/api/chat-groq', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  const token = authHeader.split(' ')[1];

  let userId = null;
  let role = null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.id;

    const admin = await Admin.findById(userId);
    if (admin) {
      role = 'admin';
    } else {
      const trainer = await StaffTrainer.findById(userId);
      if (trainer) {
        role = 'trainer';
      } else {
        const member = await Member.findById(userId);
        if (member) role = 'member';
      }
    }
    if (!role) return res.status(401).json({ error: 'User not found' });
  } catch (err) {
    console.error('Token verification failed:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  let systemPrompt = '';
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  try {
    const publicData = await getWebsiteDataForAI();
    const publicInfo = `
=== GYM INFORMATION ===
${publicData.membershipStr}
${publicData.productsStr ? 'Products: ' + publicData.productsStr : ''}
${publicData.dietStr ? 'Diet Plans: ' + publicData.dietStr : ''}
${publicData.workoutStr ? 'Workout Plans: ' + publicData.workoutStr : ''}
${publicData.trainersStr ? 'Trainers: ' + publicData.trainersStr : ''}
Contact: ${publicData.contactStr}
3‑Day Free Trial: ${publicData.trialProcess}
Privacy Policy: ${publicData.privacySummary} (see privacy.html)
Refund Policy: ${publicData.refundSummary} (see refund.html)
Terms: ${publicData.termsSummary} (see terms.html)
`;

    if (role === 'admin') {
      const totalMembers = await Member.countDocuments();
      const activeMembers = await Member.countDocuments({ status: 'active' });
      const unpaidMembers = await Member.countDocuments({ feeStatus: 'unpaid' });
      const revenueThisMonth = await Payment.aggregate([
        { $match: { paymentDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const revenue = revenueThisMonth[0]?.total || 0;
      const presentToday = await Attendance.countDocuments({ type: 'member', date: todayStr, status: 'present' });
      const totalStaff = await StaffTrainer.countDocuments();

      const allMembers = await Member.find({}, 'name phone email feeStatus status').lean();
      const attendanceTodayMap = new Map();
      const todayAttendances = await Attendance.find({ type: 'member', date: todayStr }).lean();
      todayAttendances.forEach(a => attendanceTodayMap.set(a.memberId.toString(), a.status === 'present'));
      let membersList = '';
      for (const m of allMembers) {
        const present = attendanceTodayMap.get(m._id.toString()) ? 'Yes' : 'No';
        membersList += `- ${m.name} | Phone: ${m.phone || 'N/A'} | Email: ${m.email || 'N/A'} | Fee: ${m.feeStatus || 'unpaid'} | Active: ${m.status || 'active'} | Present today: ${present}\n`;
      }

      systemPrompt = `You are UltraFit Coach (admin assistant). You have full access to gym operations and member contact details because you need to call members when required. Never invent numbers. Use the data below.

${publicInfo}

=== ADMIN DASHBOARD ===
Total members: ${totalMembers}
Active members: ${activeMembers}
Unpaid fees members: ${unpaidMembers}
Revenue this month: ₹${revenue}
Members present today: ${presentToday}
Total staff: ${totalStaff}

=== ALL MEMBERS (full details for admin) ===
${membersList || 'No members found.'}

If asked about attendance history or other specific details, politely direct the admin to use the admin panel for comprehensive reports.`;
    } 
    else if (role === 'trainer') {
      const members = await Member.find({}, 'name phone email feeStatus status').lean();
      const attendanceToday = await Attendance.find({ type: 'member', date: todayStr }).lean();
      const attendanceMap = new Map();
      attendanceToday.forEach(a => attendanceMap.set(a.memberId.toString(), a.status === 'present'));

      let membersList = '';
      for (const m of members) {
        const isPresent = attendanceMap.get(m._id.toString()) ? 'Yes' : 'No';
        membersList += `- ${m.name} | Phone: ${m.phone || 'N/A'} | Email: ${m.email || 'N/A'} | Fee: ${m.feeStatus || 'unpaid'} | Active: ${m.status || 'active'} | Present today: ${isPresent}\n`;
      }

      systemPrompt = `You are UltraFit Coach (trainer assistant). You can see all gym members and their contact info because trainers need to contact them. You can also give general fitness advice. Never share revenue or staff salary data.

${publicInfo}

=== ALL MEMBERS (trainer view) ===
${membersList || 'No members found.'}

If asked about member attendance history, you can say "I can only see today's attendance. For detailed logs, please use the trainer panel or ask the admin."`;
    } 
    else if (role === 'member') {
      const member = await Member.findById(userId).lean();
      if (!member) throw new Error('Member not found');

      const attendanceLogs = await Attendance.find({ type: 'member', memberId: userId })
        .sort({ date: -1 })
        .limit(30)
        .lean();
      const attendanceSummary = attendanceLogs.map(a => `${a.date}: ${a.status}`).join(', ');

      const lastPayment = await Payment.findOne({ memberId: userId }).sort({ paymentDate: -1 }).lean();
      const lastPaymentInfo = lastPayment ? `₹${lastPayment.amount} on ${lastPayment.paymentDate.toDateString()}` : 'No payment recorded';

      const weightHistory = await MemberWeight.find({ memberId: userId }).sort({ date: -1 }).limit(5).lean();
      const weightStr = weightHistory.map(w => `${w.date.toDateString()}: ${w.weight} kg`).join(', ');

      systemPrompt = `You are UltraFit Coach (member assistant). The person asking is ${member.name}. You can answer questions about their personal data and the gym. Never share this data with anyone else.

${publicInfo}

=== YOUR PERSONAL DATA ===
Name: ${member.name}
Email: ${member.email}
Phone: ${member.phone || 'Not provided'}
Membership status: ${member.status || 'active'}
Fee status: ${member.feeStatus || 'unpaid'}
Last payment: ${lastPaymentInfo}
Recent attendance (last 30 days): ${attendanceSummary || 'No records'}
Weight history (last 5): ${weightStr || 'No entries'}

You may also give fitness advice, diet tips, and answer gym policy questions.`;
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.4,
      max_tokens: 700,
    });

    const reply = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    res.json({ reply });
  } catch (error) {
    console.error('Role‑aware AI error:', error);
    res.status(500).json({ error: 'AI service unavailable. Please try again later.' });
  }
});

// ========== MONGODB CONNECTION ==========
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ekanshmishra124_db_user:jXNpKsmoGH2Oujas@ultrafit.9siu9qp.mongodb.net/ultrafit?retryWrites=true&w=majority';
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected to Atlas');
    console.log('📁 Database name:', mongoose.connection.name);
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ========== PROTECTED API ROUTES (require authentication) ==========
// These are placed after public routes – they may use their own auth middleware
app.use('/api/trainers', trainerRoutes);
app.use('/api/members', memberRoutes);            // Protected (profile, attendance, etc.)
app.use('/api/products', productRoutes);
app.use('/api/transformations', transformationRoutes);
app.use('/api/dietplans', dietPlanRoutes);
app.use('/api/workoutplans', workoutPlanRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/contactinfo', contactInfoRoutes);
app.use('/api/dietcategories', dietCategoriesRoutes);
app.use('/api/dietmeals', dietMealsRoutes);
app.use('/api/workoutcategories', workoutCategoriesRoutes);
app.use('/api/workoutdays', workoutDaysRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/upload', uploadRoutes);

// Authentication routes (admin, trainer, member)
app.use('/api/auth', authRoutes);                 // admin login
app.use('/api/auth', trainerAuthRoutes);          // trainer login
app.use('/api/auth', memberAuthRoutes);           // member register/login

// Trainer panel routes (protected)
app.use('/api/trainer', trainerPanelRoutes);

// Admin panel routes (protected)
app.use('/api/admin', adminPanelRoutes);

// Member self-service routes (protected)
app.use('/api/member', memberSelfRoutes);

// ========== FALLBACK FOR SPA ==========
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});