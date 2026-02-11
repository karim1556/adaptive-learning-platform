"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useRequireAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabaseClient"
import { updateStudentInClasses } from "@/lib/data-service"
import {
  User,
  GraduationCap,
  Calendar,
  Phone,
  MapPin,
  BookOpen,
  Target,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  School,
  Heart,
} from "lucide-react"

interface StudentDetails {
  firstName: string
  lastName: string
  rollNumber: string
  dateOfBirth: string
  grade: string
  school: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  parentName: string
  parentEmail: string
  parentPhone: string
  interests: string[]
  goals: string
  bio: string
}

const GRADE_OPTIONS = [
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "9th Grade (Freshman)",
  "10th Grade (Sophomore)",
  "11th Grade (Junior)",
  "12th Grade (Senior)",
  "College Freshman",
  "College Sophomore",
  "College Junior",
  "College Senior",
  "Graduate Student",
  "Other",
]

const INTEREST_OPTIONS = [
  "Mathematics",
  "Science",
  "English/Literature",
  "History",
  "Art & Design",
  "Music",
  "Technology",
  "Programming",
  "Sports",
  "Languages",
  "Business",
  "Psychology",
  "Biology",
  "Chemistry",
  "Physics",
  "Engineering",
]

function StudentOnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEditMode = searchParams.get("edit") === "true"
  const { user, loading } = useRequireAuth(["student"])
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [details, setDetails] = useState<StudentDetails>({
    firstName: "",
    lastName: "",
    rollNumber: "",
    dateOfBirth: "",
    grade: "",
    school: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    interests: [],
    goals: "",
    bio: "",
  })

  // Check if already completed onboarding OR load existing data for edit mode
  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase.auth.getUser()
      const meta = data?.user?.user_metadata || {}
      
      // If edit mode, load existing data
      if (isEditMode && meta.studentDetails) {
        setDetails({
          firstName: meta.studentDetails.firstName || meta.firstName || "",
          lastName: meta.studentDetails.lastName || meta.lastName || "",
          rollNumber: meta.studentDetails.rollNumber || "",
          dateOfBirth: meta.studentDetails.dateOfBirth || "",
          grade: meta.studentDetails.grade || "",
          school: meta.studentDetails.school || "",
          phone: meta.studentDetails.phone || "",
          address: meta.studentDetails.address || "",
          city: meta.studentDetails.city || "",
          state: meta.studentDetails.state || "",
          zipCode: meta.studentDetails.zipCode || "",
          parentName: meta.studentDetails.parentName || "",
          parentEmail: meta.studentDetails.parentEmail || "",
          parentPhone: meta.studentDetails.parentPhone || "",
          interests: meta.studentDetails.interests || [],
          goals: meta.studentDetails.goals || "",
          bio: meta.studentDetails.bio || "",
        })
        setIsInitialized(true)
      } else if (meta.onboardingComplete && !isEditMode) {
        // Only redirect if not in edit mode
        router.push("/student/dashboard")
      } else {
        setIsInitialized(true)
      }
    }
    loadData()
  }, [router, isEditMode])

  if (loading || !isInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  const updateField = (field: keyof StudentDetails, value: string | string[]) => {
    setDetails(prev => ({ ...prev, [field]: value }))
  }

  const toggleInterest = (interest: string) => {
    setDetails(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await supabase.auth.updateUser({
        data: {
          firstName: details.firstName,
          lastName: details.lastName,
          studentDetails: details,
          onboardingComplete: true,
        },
      })
      
      // Also update localStorage for demo mode
      const stored = localStorage.getItem("user")
      let userId = user?.id
      if (stored) {
        const userData = JSON.parse(stored)
        userData.firstName = details.firstName
        userData.lastName = details.lastName
        userData.studentDetails = details
        userData.onboardingComplete = true
        localStorage.setItem("user", JSON.stringify(userData))
        // Use localStorage user ID if available
        if (userData.id) userId = userData.id
      }
      
      // Update student info in all enrolled classes
      const fullName = `${details.firstName} ${details.lastName}`.trim()
      console.log("Onboarding: Updating student in classes with ID:", userId, "name:", fullName, "roll:", details.rollNumber)
      if (userId && fullName) {
        await updateStudentInClasses(userId, fullName, details.rollNumber)
      }
      
      router.push(isEditMode ? "/student/profile" : "/student/dashboard")
    } catch (error) {
      console.error("Error saving details:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return details.firstName.trim() !== "" && details.lastName.trim() !== "" && details.grade !== ""
      case 2:
        return true // Optional step
      case 3:
        return true // Optional step
      case 4:
        return details.interests.length > 0
      default:
        return true
    }
  }

  const totalSteps = 4

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Complete Your Profile
          </h1>
          <p className="text-slate-500 mt-2">
            Tell us a bit more about yourself to personalize your learning experience
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500">Step {step} of {totalSteps}</span>
            <span className="text-sm font-medium text-blue-600">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Step 1: Personal & Academic Info */}
          {step === 1 && (
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 text-blue-600 mb-4">
                <User className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Personal Information</h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={details.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                      placeholder="Enter your first name"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={details.lastName}
                      onChange={(e) => updateField("lastName", e.target.value)}
                      placeholder="Enter your last name"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Roll Number / Student ID
                    </label>
                    <input
                      type="text"
                      value={details.rollNumber}
                      onChange={(e) => updateField("rollNumber", e.target.value)}
                      placeholder="e.g., 2024CS101"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Date of Birth
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="date"
                        value={details.dateOfBirth}
                        onChange={(e) => updateField("dateOfBirth", e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Current Grade Level *
                  </label>
                  <select
                    value={details.grade}
                    onChange={(e) => updateField("grade", e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  >
                    <option value="">Select your grade</option>
                    {GRADE_OPTIONS.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    School Name
                  </label>
                  <div className="relative">
                    <School className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={details.school}
                      onChange={(e) => updateField("school", e.target.value)}
                      placeholder="Enter your school name"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact Info */}
          {step === 2 && (
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 text-blue-600 mb-4">
                <Phone className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Contact Information</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      value={details.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Street Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={details.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      placeholder="123 Main St"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={details.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="City"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={details.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      placeholder="State"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={details.zipCode}
                    onChange={(e) => updateField("zipCode", e.target.value)}
                    placeholder="12345"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Parent/Guardian Info */}
          {step === 3 && (
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 text-blue-600 mb-4">
                <User className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Parent/Guardian Information</h2>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Optional: Add your parent or guardian's contact information
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Parent/Guardian Name
                  </label>
                  <input
                    type="text"
                    value={details.parentName}
                    onChange={(e) => updateField("parentName", e.target.value)}
                    placeholder="Full name"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Parent/Guardian Email
                  </label>
                  <input
                    type="email"
                    value={details.parentEmail}
                    onChange={(e) => updateField("parentEmail", e.target.value)}
                    placeholder="parent@email.com"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Parent/Guardian Phone
                  </label>
                  <input
                    type="tel"
                    value={details.parentPhone}
                    onChange={(e) => updateField("parentPhone", e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Interests & Goals */}
          {step === 4 && (
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 text-blue-600 mb-4">
                <Heart className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Interests & Goals</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    What subjects interest you? *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((interest) => (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                          details.interests.includes(interest)
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                        }`}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                  {details.interests.length > 0 && (
                    <p className="text-sm text-blue-600 mt-2">
                      {details.interests.length} subject{details.interests.length !== 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    What are your learning goals?
                  </label>
                  <div className="relative">
                    <Target className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                    <textarea
                      value={details.goals}
                      onChange={(e) => updateField("goals", e.target.value)}
                      placeholder="What do you want to achieve? E.g., improve math grades, learn coding, prepare for college..."
                      rows={3}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Tell us about yourself
                  </label>
                  <textarea
                    value={details.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    placeholder="A short bio about yourself, your hobbies, or anything you'd like us to know..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white transition"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Complete Setup
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Skip Option */}
        <div className="text-center mt-6">
          <button
            onClick={() => {
              // Mark as skipped but allow completion later
              supabase.auth.updateUser({ data: { onboardingSkipped: true } })
              router.push("/student/dashboard")
            }}
            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StudentOnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-muted-foreground">Loading onboarding...</p>
        </div>
      </div>
    }>
      <StudentOnboardingContent />
    </Suspense>
  )
}
