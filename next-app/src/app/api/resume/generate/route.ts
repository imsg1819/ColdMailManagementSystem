import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import Groq from "groq-sdk";

const LATEX_TEMPLATE = `\\documentclass[9.5pt, letterpaper]{article}

% ---------- Packages ----------
\\usepackage[top=1.5cm, bottom=0.5cm, left=1.2cm, right=1.2cm]{geometry}
\\usepackage{titlesec}
\\usepackage{tabularx}
\\usepackage[dvipsnames]{xcolor}
\\usepackage{enumitem}
\\usepackage{fontawesome5}
\\usepackage{hyperref}
\\usepackage{charter}

\\definecolor{primaryColor}{RGB}{0,0,0}

\\hypersetup{
    colorlinks=true,
    urlcolor=primaryColor,
    pdftitle={Resume},
    pdfauthor={Candidate}
}

\\raggedright
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{1pt}

\\renewcommand\\labelitemi{$\\vcenter{\\hbox{\\small$\\bullet$}}$}

\\titleformat{\\section}{\\bfseries\\large}{}{0pt}{}[\\titlerule]
\\titlespacing{\\section}{0pt}{0.2cm}{0.1cm}

\\newenvironment{highlights}{
    \\begin{itemize}[topsep=1pt, itemsep=1pt, parsep=0pt, leftmargin=12pt]
}{
    \\end{itemize}
}

\\begin{document}

% ---------- HEADER ----------
\\begin{center}
    {\\fontsize{18pt}{18pt}\\selectfont \\textbf{FULL NAME}}\\\\[2pt]
    \\textbf{Target Role $|$ Key Skill 1 $|$ Key Skill 2 $|$ Key Skill 3}\\\\[3pt]
    email@example.com
    \\quad $|$ \\quad +91-XXXXXXXXXX
    \\quad $|$ \\quad \\href{https://linkedin.com/in/username}{linkedin.com/in/username}
\\end{center}

% ---------- PROFESSIONAL SUMMARY ----------
\\section{PROFESSIONAL SUMMARY}
A concise 2-3 line summary tailored to the job description.

% ---------- TECHNICAL SKILLS ----------
\\section{TECHNICAL SKILLS}
\\textbf{Category 1:} Skill $|$ Skill $|$ Skill \\\\
\\textbf{Category 2:} Skill $|$ Skill $|$ Skill

% ---------- PROFESSIONAL EXPERIENCE ----------
\\section{PROFESSIONAL EXPERIENCE}

\\textbf{Job Title} \\hfill \\textit{Date Range}\\\\
Company Name, Location
\\begin{highlights}
    \\item Achievement with quantified impact
\\end{highlights}

% ---------- PROJECTS ----------
\\section{PROJECTS}

\\textbf{Project Name} \\hfill \\textit{Context}
\\begin{highlights}
    \\item What you built and the measurable outcome
\\end{highlights}

% ---------- CERTIFICATIONS ----------
\\section{CERTIFICATIONS}
\\begin{highlights}
    \\item Certification Name -- Issuing Organization
\\end{highlights}

% ---------- ACHIEVEMENTS ----------
\\section{ACHIEVEMENTS}
\\begin{highlights}
    \\item Notable achievement with context
\\end{highlights}

% ---------- EDUCATION ----------
\\section{EDUCATION}
\\textbf{Degree -- Specialization} \\hfill \\textit{Date Range}\\\\
University Name \\quad $|$ \\quad GPA/CGPA \\quad $|$ \\quad Location

\\end{document}`;

function buildPrompt(jobDescription: string, resumeDetails: string): string {
    return `You are an expert ATS (Applicant Tracking System) resume optimization specialist and LaTeX typesetter.

YOUR TASK:
Given the candidate's resume details and a target job description, generate a complete, compilable LaTeX resume that:
1. Is optimized for ATS systems — uses standard section headings, includes relevant keywords from the job description naturally
2. Tailors the candidate's experience to highlight relevant skills and achievements for the specific role
3. Uses quantified achievements wherever possible (numbers, percentages, metrics)
4. Follows the exact LaTeX template format provided below
5. Keeps content concise — each bullet point should be 1-2 lines max
6. Prioritizes the most relevant experience and skills for the target role
7. Uses strong action verbs to start each bullet point
8. Removes or de-emphasizes irrelevant experience

LATEX TEMPLATE TO FOLLOW (use this exact structure, packages, and formatting):
${LATEX_TEMPLATE}

---

JOB DESCRIPTION:
${jobDescription}

---

CANDIDATE'S CURRENT RESUME DETAILS:
${resumeDetails}

---

INSTRUCTIONS:
- Output ONLY the complete LaTeX code. No explanations, no markdown code fences, no commentary.
- Fill in ALL sections with real, tailored content based on the candidate's details.
- The header should have the candidate's actual name, contact info, and a tagline matching the target role.
- The Professional Summary should be 2-3 lines, directly addressing the job requirements.
- Technical Skills should be reorganized to lead with skills mentioned in the job description.
- Experience bullet points should be rewritten to emphasize relevant responsibilities and achievements.
- Projects should highlight those most relevant to the target role.
- If the candidate doesn't have certain sections (certifications, achievements), include them only if there's real content.
- Ensure the LaTeX compiles without errors on Overleaf.
- Do NOT invent fake experience or skills the candidate doesn't have. Only rephrase and highlight existing ones.`;
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { jobDescription, resumeDetails } = await req.json();

        if (!jobDescription || !resumeDetails) {
            return NextResponse.json(
                { error: "Both job description and resume details are required." },
                { status: 400 }
            );
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Groq API key is not configured. Please add a valid GROQ_API_KEY to your .env file." },
                { status: 500 }
            );
        }

        const groq = new Groq({ apiKey });

        const prompt = buildPrompt(jobDescription, resumeDetails);

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
        });

        let latexCode = chatCompletion.choices[0]?.message?.content || "";

        // Clean up: remove markdown code fences if the model wraps the output
        latexCode = latexCode.replace(/^```(?:latex|tex)?\s*\n?/i, "");
        latexCode = latexCode.replace(/\n?```\s*$/i, "");
        latexCode = latexCode.trim();

        return NextResponse.json({
            success: true,
            latex: latexCode,
        });
    } catch (error: any) {
        console.error("Resume generation error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate resume. Please try again." },
            { status: 500 }
        );
    }
}
