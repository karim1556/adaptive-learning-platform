"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HelpCircle, Mail, BookOpen, MessageSquare, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

interface FAQItem {
  q: string
  a: string
}

function FAQSection({ title, items }: { title: string; items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {items.map((item, i) => (
          <div key={i}>
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <span className="font-medium text-slate-900 dark:text-white">{item.q}</span>
              {openIndex === i ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            {openIndex === i && (
              <div className="px-6 pb-4">
                <p className="text-slate-600 dark:text-slate-400">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">AdaptIQ</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button className="bg-blue-600 hover:bg-blue-700">Sign In</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Back Button */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">How Can We Help?</h1>
          <p className="text-xl text-slate-600 dark:text-slate-400">Find answers to common questions about AdaptIQ</p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-6">
          <FAQSection 
            title="Getting Started"
            items={[
              {
                q: "How do I log in?",
                a: "Use your email and password on the login page. First-time users will be guided through creating an account."
              },
              {
                q: "What is the VARK survey?",
                a: "The VARK survey identifies your learning style (Visual, Auditory, Reading, or Kinesthetic). This helps us personalize your learning experience."
              },
              {
                q: "How do I take the VARK survey?",
                a: "After logging in as a student, you'll be prompted to take the VARK survey on first login. You can also retake it anytime in your profile settings."
              }
            ]}
          />

          <FAQSection 
            title="Learning & Progress"
            items={[
              {
                q: "How does the AI tutor work?",
                a: "The AI tutor adapts to your learning style. It provides explanations, examples, and practice problems tailored to how you learn best."
              },
              {
                q: "What is mastery score?",
                a: "Your mastery score shows how well you understand a topic (0-100%). It's calculated from your assessments and practice performance."
              },
              {
                q: "How do I track my progress?",
                a: "Check your dashboard to see overall mastery, topic-specific scores, engagement metrics, and recent learning activity."
              }
            ]}
          />

          <FAQSection 
            title="For Teachers & Parents"
            items={[
              {
                q: "How do I view student progress?",
                a: "Teachers can access the Student Analytics page to see individual student insights, engagement trends, and mastery scores."
              },
              {
                q: "What information can parents see?",
                a: "Parents can view their child's overall progress, mastery scores, learning style, engagement level, and growth over time."
              },
              {
                q: "How do I get engagement alerts?",
                a: "Admins and teachers automatically receive alerts when students show low engagement. Check your dashboard notification panel."
              }
            ]}
          />
        </div>

        {/* Contact Support */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Still Need Help?</h2>
          <p className="text-blue-100 mb-6">
            Contact our support team for additional assistance with your AdaptIQ account.
          </p>
          <Button className="bg-white text-blue-600 hover:bg-slate-100">
            <Mail className="w-4 h-4 mr-2" />
            Email Support
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 dark:text-slate-400 text-sm">
          <p>AdaptIQ - Adaptive Learning Platform © 2026</p>
        </div>
      </footer>
    </div>
  )
}
