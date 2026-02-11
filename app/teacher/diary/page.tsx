"use client"

import { useState, useEffect } from "react"
import { useRequireAuth } from "@/hooks/use-auth"
import { TeacherHeader } from "@/components/teacher/header-new"
import { TeacherSidebar } from "@/components/teacher/sidebar-new"
import { supabase } from "@/lib/supabaseClient"
import {
  Calendar,
  UserCheck,
  UserX,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  Plus,
  X,
  Save,
  ChevronDown,
  BookOpen,
  Award,
  ClipboardList
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Class {
  id: string
  class_name: string
  class_code: string
}

interface Student {
  id: string
  user_id: string
  student_profile_id?: string // The actual student_profiles.id for FK constraints
  profiles?: {
    full_name: string
  }
  email?: string
  rollNumber?: string
}
interface AttendanceRecord {
  student_id: string
  date: string
  status: "present" | "absent" | "late"
}

interface MarksRecord {
  student_id: string
  unit: number
  marks: number
  total_marks: number
}

interface Topic {
  id: string
  title: string
  description: string
  status: "planned" | "ongoing" | "completed"
  date: string
}

interface Note {
  id: string
  date: string
  content: string
}

export default function TeacherDiaryPage() {
  const { user } = useRequireAuth(["teacher"])
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [students, setStudents] = useState<Student[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [activeTab, setActiveTab] = useState<"attendance" | "marks" | "topics" | "notes">("attendance")
  
  // Attendance state
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent" | "late">>({})
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  
  // Marks state
  const [marksData, setMarksData] = useState<Record<string, { unit1: string; unit2: string }>>({})
  const [marksLoading, setMarksLoading] = useState(false)
  const [marksFile, setMarksFile] = useState<File | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string; uploaded_at: string }[]>([])
  
  // Topics state
  const [topics, setTopics] = useState<Topic[]>([])
  const [newTopic, setNewTopic] = useState({ title: "", description: "", status: "planned" as const })
  const [showTopicForm, setShowTopicForm] = useState(false)
  
  // Notes state
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState("")
  const [showNoteForm, setShowNoteForm] = useState(false)

  // Load classes
  useEffect(() => {
    if (user) {
      loadClasses()
    }
  }, [user])

  // Load students when class is selected
  useEffect(() => {
    if (selectedClass) {
      loadStudents()
      loadUploadedFiles()
      loadTopics()
      loadNotes()
    }
  }, [selectedClass])

  // Load attendance and marks after students are loaded
  useEffect(() => {
    if (selectedClass && students.length > 0) {
      loadAttendance()
      loadMarks()
    }
  }, [selectedClass, selectedDate, students.length])

  const loadClasses = async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from("classes")
      .select("id, class_name, class_code")
      .eq("teacher_id", user.id)
    
    if (data) {
      setClasses(data)
      if (data.length > 0 && !selectedClass) {
        setSelectedClass(data[0].id)
      }
    }
  }

  const loadStudents = async () => {
    if (!selectedClass) return
    
    // Find the class_code for the selected class
    const currentClass = classes.find(c => c.id === selectedClass)
    if (!currentClass) return

    const { data: csData, error: csError } = await supabase
      .from("class_students")
      .select("student_id, name, roll_number, email")
      .eq("class_code", currentClass.class_code)

    if (!csData || csData.length === 0) {
      setStudents([])
      return
    }

    // Fetch student_profiles for all student_ids
    const ids = csData.map((s: any) => s.student_id)

    // The database trigger should have created profiles, but ensure they exist
    const { data: profiles, error: profilesError } = await supabase
      .from("student_profiles")
      .select("id, user_id")
      .in("user_id", ids)

    if (profilesError) {
      console.error("Error loading student profiles:", profilesError)
    }

    const profileMap = new Map<string, { id: string; user_id: string }>()
    ;(profiles || []).forEach((p: any) => {
      profileMap.set(p.user_id, p)
    })

    // Find missing profiles and create them
    const missingIds = ids.filter(id => !profileMap.has(id))
    if (missingIds.length > 0) {
      console.log('Auto-creating missing profiles for:', missingIds)
      try {
        const res = await fetch('/api/teacher/ensure-student-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentIds: missingIds })
        })
        const json = await res.json()
        if (json.data) {
          json.data.forEach((p: any) => profileMap.set(p.user_id, p))
        }
      } catch (e) {
        console.error('Exception creating profiles:', e)
      }
    }

    const studentsData = csData.map((s: any) => {
      const profile = profileMap.get(s.student_id)
      return {
        id: s.student_id,
        user_id: s.student_id,
        student_profile_id: profile?.id,
        profiles: { full_name: s.name || "Unknown Student" },
        email: s.email || undefined,
        rollNumber: s.roll_number
      }
    })

    console.log('Loaded students:', studentsData)
    setStudents(studentsData)
  }

  const loadAttendance = async () => {
    if (!selectedClass) return

    // Fetch attendance and include the linked student_profiles.user_id via relationship
    const { data, error } = await supabase
      .from("attendance")
      .select("student_id, status, student_profiles(user_id)")
      .eq("class_id", selectedClass)
      .eq("date", selectedDate)

    if (error) {
      console.error("Error loading attendance:", error)
      setAttendance({})
      return
    }

    // Build a map from student_profile_id to student.id (which is user_id from class_students)
    const profileToStudentId = new Map<string, string>()
    students.forEach(s => {
      if (s.student_profile_id) {
        profileToStudentId.set(s.student_profile_id, s.id)
      }
    })

    const attendanceMap: Record<string, "present" | "absent" | "late"> = {}
    ;(data || []).forEach((record: any) => {
      // Try to get user_id from the relation, or map from student_id (profile id) to our student.id
      const userId = record.student_profiles?.user_id || profileToStudentId.get(record.student_id) || null
      if (userId) {
        attendanceMap[userId] = record.status
      }
    })

    console.log("Loaded attendance (mapped by user_id):", attendanceMap, { raw: data })
    setAttendance(attendanceMap)
  }

  const saveAttendance = async () => {
    if (!selectedClass) return
    setAttendanceLoading(true)
    
    try {
      // Delete existing attendance for this date
      await supabase
        .from("attendance")
        .delete()
        .eq("class_id", selectedClass)
        .eq("date", selectedDate)
      
      // Insert new attendance records
      const attendanceEntries = Object.entries(attendance)
      const studentMap: Record<string, Student> = {}
      students.forEach((s) => (studentMap[s.id] = s))

      // Check for missing profiles and create them if needed
      const missingProfileIds = attendanceEntries
        .map(([studentId]) => studentMap[studentId])
        .filter(s => s && !s.student_profile_id)
        .map(s => s.id)

      if (missingProfileIds.length > 0) {
        console.log('Creating missing profiles before save:', missingProfileIds)
        try {
          const res = await fetch('/api/teacher/ensure-student-profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentIds: missingProfileIds })
          })
          const json = await res.json()
          if (json.data) {
            // Update local student map with new profile IDs
            json.data.forEach((p: any) => {
              if (studentMap[p.user_id]) {
                studentMap[p.user_id].student_profile_id = p.id
              }
            })
          }
          if (json.error) {
            console.error('Error creating profiles:', json.error)
          }
        } catch (e) {
          console.error('Exception creating profiles:', e)
        }
      }

      const records = attendanceEntries
        .map(([studentId, status]) => {
          const student = studentMap[studentId]
          const profileId = student?.student_profile_id
          if (!profileId) {
            console.warn(`No profile for student ${studentId}, skipping`)
            return null
          }
          return {
            class_id: selectedClass,
            student_id: profileId,
            date: selectedDate,
            status
          }
        })
        .filter(Boolean) as Array<{ class_id: string; student_id: string; date: string; status: string }>

      console.log('Saving attendance records:', records)

      if (records.length > 0) {
        const { data: resData, error } = await supabase
          .from("attendance")
          .upsert(records, { onConflict: "class_id,student_id,date" })

        if (error) {
          console.error("Attendance upsert error:", error, resData)
          alert("Failed to save attendance: " + (error.message || JSON.stringify(error)))
        } else {
          alert("Attendance saved successfully!")
          // Reload attendance to confirm persistence
          await loadAttendance()
        }
      } else {
        // If there are no attendance records to insert, we removed existing ones
        alert("Attendance cleared for this date.")
        await loadAttendance()
      }
    } catch (error) {
      console.error("Error saving attendance:", error)
      alert("Failed to save attendance")
    } finally {
      setAttendanceLoading(false)
    }
  }

  const loadMarks = async () => {
    if (!selectedClass) return

    // Fetch marks and include the linked student_profiles.user_id via relationship
    const { data, error } = await supabase
      .from("student_marks")
      .select("student_id, unit, marks, student_profiles(user_id)")
      .eq("class_id", selectedClass)
      .in("unit", [1, 2])

    if (error) {
      console.error("Error loading marks:", error)
      setMarksData({})
      return
    }

    // Build a map from student_profile_id to student.id (which is user_id from class_students)
    const profileToStudentId = new Map<string, string>()
    students.forEach(s => {
      if (s.student_profile_id) {
        profileToStudentId.set(s.student_profile_id, s.id)
      }
    })

    const marksMap: Record<string, { unit1: string; unit2: string }> = {}
    ;(data || []).forEach((record: any) => {
      // Try to get user_id from the relation, or map from student_id (profile id) to our student.id
      const userId = record.student_profiles?.user_id || profileToStudentId.get(record.student_id) || null
      if (!userId) return
      if (!marksMap[userId]) marksMap[userId] = { unit1: "", unit2: "" }
      if (record.unit === 1) marksMap[userId].unit1 = String(record.marks)
      if (record.unit === 2) marksMap[userId].unit2 = String(record.marks)
    })

    console.log("Loaded marks (mapped by user_id):", marksMap, { raw: data })
    setMarksData(marksMap)
  }

  const saveMarks = async () => {
    if (!selectedClass) return
    setMarksLoading(true)
    
    try {
      const records: any[] = []
      const studentMap: Record<string, Student> = {}
      students.forEach((s) => (studentMap[s.id] = s))

      // Check for missing profiles and create them if needed
      const missingProfileIds = Object.keys(marksData)
        .map(studentId => studentMap[studentId])
        .filter(s => s && !s.student_profile_id)
        .map(s => s.id)

      if (missingProfileIds.length > 0) {
        console.log('Creating missing profiles before saving marks:', missingProfileIds)
        try {
          const res = await fetch('/api/teacher/ensure-student-profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentIds: missingProfileIds })
          })
          const json = await res.json()
          if (json.data) {
            // Update local student map with new profile IDs
            json.data.forEach((p: any) => {
              if (studentMap[p.user_id]) {
                studentMap[p.user_id].student_profile_id = p.id
              }
            })
            console.log('Created profiles:', json.data)
          }
          if (json.error) {
            console.error('Error creating profiles:', json.error)
          }
        } catch (e) {
          console.error('Exception creating profiles:', e)
        }
      }

      Object.entries(marksData).forEach(([studentId, marks]) => {
        const student = studentMap[studentId]
        const profileId = student?.student_profile_id
        
        if (!profileId) {
          console.warn(`Student ${studentId} has no student_profile_id, skipping marks save`)
          return
        }
        
        if (marks.unit1) {
          records.push({
            class_id: selectedClass,
            student_id: profileId,
            unit: 1,
            marks: parseFloat(marks.unit1) || 0,
            total_marks: 100
          })
        }
        if (marks.unit2) {
          records.push({
            class_id: selectedClass,
            student_id: profileId,
            unit: 2,
            marks: parseFloat(marks.unit2) || 0,
            total_marks: 100
          })
        }
      })
      
      // Validate records to prevent duplicates
      const uniqueRecords = new Map();
      records.forEach((record) => {
        const key = `${record.class_id}-${record.student_id}-${record.unit}`;
        if (!uniqueRecords.has(key)) {
          uniqueRecords.set(key, record);
        }
      });

      const deduplicatedRecords = Array.from(uniqueRecords.values());

      console.log("Saving marks records:", deduplicatedRecords);

      if (deduplicatedRecords.length > 0) {
        const { error } = await supabase
          .from("student_marks")
          .upsert(deduplicatedRecords, { onConflict: "class_id,student_id,unit" });

        if (!error) {
          alert("Marks saved successfully!");
        } else {
          console.error("Error during upsert:", error);
          alert("Failed to save marks: " + error.message);
        }
      } else {
        alert("No valid marks to save. Ensure students have profiles.");
      }
    } catch (error) {
      console.error("Error saving marks:", error)
      alert("Failed to save marks")
    } finally {
      setMarksLoading(false)
    }
  }

  const handleFileUpload = async () => {
    if (!marksFile || !selectedClass || !user) return
    setMarksLoading(true)

    try {
      // Upload file to Supabase storage
      const fileExt = marksFile.name.split('.').pop()
      const fileName = `${selectedClass}_${Date.now()}.${fileExt}`
      const filePath = `marks/${user.id}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('teacher-files')
        .upload(filePath, marksFile)

      if (uploadError) {
        // If bucket doesn't exist, store metadata only
        console.warn("Storage upload failed, storing metadata only:", uploadError)
      }

      // Store file metadata in database
      const { error: dbError } = await supabase
        .from('class_file_uploads')
        .insert({
          class_id: selectedClass,
          teacher_id: user.id,
          file_name: marksFile.name,
          file_path: uploadData?.path || filePath,
          file_type: 'marks',
          uploaded_at: new Date().toISOString()
        })

      if (!dbError) {
        alert(`File "${marksFile.name}" uploaded successfully!`)
        setMarksFile(null)
        loadUploadedFiles()
      } else {
        // Fallback: store in localStorage if database fails
        const localFiles = JSON.parse(localStorage.getItem(`marks_files_${selectedClass}`) || '[]')
        localFiles.push({
          name: marksFile.name,
          uploaded_at: new Date().toISOString(),
          data: await marksFile.text()
        })
        localStorage.setItem(`marks_files_${selectedClass}`, JSON.stringify(localFiles))
        alert(`File "${marksFile.name}" saved locally!`)
        setMarksFile(null)
        loadUploadedFiles()
      }
    } catch (error) {
      console.error("Error uploading file:", error)
      alert("Failed to upload file")
    } finally {
      setMarksLoading(false)
    }
  }

  const loadUploadedFiles = async () => {
    if (!selectedClass) return

    // Try loading from database
    const { data } = await supabase
      .from('class_file_uploads')
      .select('file_name, file_path, uploaded_at')
      .eq('class_id', selectedClass)
      .eq('file_type', 'marks')
      .order('uploaded_at', { ascending: false })

    if (data && data.length > 0) {
      setUploadedFiles(data.map((f: any) => ({
        name: f.file_name,
        url: f.file_path,
        uploaded_at: f.uploaded_at
      })))
    } else {
      // Fallback to localStorage
      const localFiles = JSON.parse(localStorage.getItem(`marks_files_${selectedClass}`) || '[]')
      setUploadedFiles(localFiles.map((f: any) => ({
        name: f.name,
        url: '#',
        uploaded_at: f.uploaded_at
      })))
    }
  }

  const loadTopics = async () => {
    if (!selectedClass) return
    
    const { data } = await supabase
      .from("class_topics")
      .select("*")
      .eq("class_id", selectedClass)
      .order("date", { ascending: false })
    
    if (data) {
      setTopics(data)
    }
  }

  const saveTopic = async () => {
    if (!selectedClass || !newTopic.title) return
    
    const { error } = await supabase.from("class_topics").insert({
      class_id: selectedClass,
      title: newTopic.title,
      description: newTopic.description,
      status: newTopic.status,
      date: new Date().toISOString()
    })
    
    if (!error) {
      setNewTopic({ title: "", description: "", status: "planned" })
      setShowTopicForm(false)
      loadTopics()
    }
  }

  const updateTopicStatus = async (topicId: string, status: Topic["status"]) => {
    await supabase
      .from("class_topics")
      .update({ status })
      .eq("id", topicId)
    
    loadTopics()
  }

  const loadNotes = async () => {
    if (!selectedClass) return
    
    const { data } = await supabase
      .from("class_notes")
      .select("*")
      .eq("class_id", selectedClass)
      .order("date", { ascending: false })
    
    if (data) {
      setNotes(data)
    }
  }

  const saveNote = async () => {
    if (!selectedClass || !newNote) return
    
    const { error } = await supabase.from("class_notes").insert({
      class_id: selectedClass,
      date: selectedDate,
      content: newNote
    })
    
    if (!error) {
      setNewNote("")
      setShowNoteForm(false)
      loadNotes()
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      <TeacherSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {user && <TeacherHeader user={user} />}
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Class Diary</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Track attendance, marks, topics, and notes
                </p>
              </div>
              
              {/* Class Selector */}
              <div className="flex items-center gap-4">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name} ({cls.class_code})
                    </option>
                  ))}
                </select>
                
                {activeTab === "attendance" && (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-700">
              <div className="flex gap-8">
                {[
                  { id: "attendance", label: "Attendance", icon: UserCheck },
                  { id: "marks", label: "Marks", icon: Award },
                  { id: "topics", label: "Topics & Syllabus", icon: BookOpen },
                  { id: "notes", label: "Notes", icon: FileText }
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 border-b-2 transition",
                        activeTab === tab.id
                          ? "border-indigo-600 text-indigo-600"
                          : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Attendance Tab */}
            {activeTab === "attendance" && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {"Attendance - " + (() => {
                      const [y, m, d] = selectedDate.split("-")
                      return `${d}/${m}/${y}`
                    })()}
                  </h2>
                  <button
                    onClick={saveAttendance}
                    disabled={attendanceLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {attendanceLoading ? "Saving..." : "Save Attendance"}
                  </button>
                </div>
                
                <div className="p-6">
                  {students.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">No students in this class</p>
                  ) : (
                    <div className="space-y-3">
                      {students.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800"
                        >
                          <div className="flex-1">
                            <span className="font-medium text-slate-900 dark:text-white">
                              {student.profiles?.full_name || "Unknown Student"}
                            </span>
                            {student.rollNumber && (
                              <span className="ml-2 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded">
                                Roll: {student.rollNumber}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            {["present", "late", "absent"].map((status) => (
                              <button
                                key={status}
                                onClick={() => setAttendance({ ...attendance, [student.id]: status as any })}
                                className={cn(
                                  "px-4 py-2 rounded-lg font-medium transition",
                                  attendance[student.id] === status
                                    ? status === "present"
                                      ? "bg-emerald-600 text-white"
                                      : status === "late"
                                      ? "bg-amber-600 text-white"
                                      : "bg-red-600 text-white"
                                    : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                                )}
                              >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Marks Tab */}
            {activeTab === "marks" && (
              <div className="space-y-6">
                {/* File Upload Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                      Upload Marks File
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Upload CSV, Excel, PDF, or any document containing marks data
                    </p>
                    
                    <div className="flex items-center gap-4">
                      <label className="flex-1">
                        <div className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer transition">
                          <Upload className="w-5 h-5 text-slate-400" />
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {marksFile ? marksFile.name : "Choose file to upload..."}
                          </span>
                        </div>
                        <input
                          type="file"
                          onChange={(e) => setMarksFile(e.target.files?.[0] || null)}
                          className="hidden"
                          accept=".csv,.xlsx,.xls,.pdf,.doc,.docx,.txt"
                        />
                      </label>
                      
                      <button
                        onClick={handleFileUpload}
                        disabled={!marksFile || marksLoading}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        <Upload className="w-4 h-4 inline mr-2" />
                        Upload
                      </button>
                    </div>

                    {/* Uploaded Files List */}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                          Uploaded Files
                        </h3>
                        <div className="space-y-2">
                          {uploadedFiles.map((file, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-indigo-600" />
                                <div>
                                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {new Date(file.uploaded_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual Entry Section */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                      Manual Entry - Unit Test Marks
                    </h2>
                    <button
                      onClick={saveMarks}
                      disabled={marksLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {marksLoading ? "Saving..." : "Save Marks"}
                    </button>
                  </div>
                
                  <div className="p-6 overflow-x-auto">{students.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">No students in this class</p>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            Student Name
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            Roll No.
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            Unit 1 (out of 100)
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            Unit 2 (out of 100)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
                          <tr
                            key={student.id}
                            className="border-b border-slate-100 dark:border-slate-800"
                          >
                            <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                              {student.profiles?.full_name || "Unknown Student"}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                              {student.rollNumber || "-"}
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={marksData[student.id]?.unit1 || ""}
                                onChange={(e) =>
                                  setMarksData({
                                    ...marksData,
                                    [student.id]: {
                                      ...marksData[student.id],
                                      unit1: e.target.value,
                                      unit2: marksData[student.id]?.unit2 || ""
                                    }
                                  })
                                }
                                className="w-full px-3 py-2 text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                placeholder="--"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={marksData[student.id]?.unit2 || ""}
                                onChange={(e) =>
                                  setMarksData({
                                    ...marksData,
                                    [student.id]: {
                                      unit1: marksData[student.id]?.unit1 || "",
                                      unit2: e.target.value
                                    }
                                  })
                                }
                                className="w-full px-3 py-2 text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                placeholder="--"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Topics Tab */}
            {activeTab === "topics" && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                      Topics & Syllabus
                    </h2>
                    <button
                      onClick={() => setShowTopicForm(!showTopicForm)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                    >
                      <Plus className="w-4 h-4" />
                      Add Topic
                    </button>
                  </div>
                  
                  {showTopicForm && (
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                      <div className="space-y-4">
                        <input
                          type="text"
                          value={newTopic.title}
                          onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                          placeholder="Topic title"
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                        <textarea
                          value={newTopic.description}
                          onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                          placeholder="Description"
                          rows={3}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveTopic}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                          >
                            Save Topic
                          </button>
                          <button
                            onClick={() => setShowTopicForm(false)}
                            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-6">
                    {topics.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">No topics added yet</p>
                    ) : (
                      <div className="space-y-3">
                        {topics.map((topic) => (
                          <div
                            key={topic.id}
                            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-2"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                  {topic.title}
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                  {topic.description}
                                </p>
                              </div>
                              <select
                                value={topic.status}
                                onChange={(e) => updateTopicStatus(topic.id, e.target.value as any)}
                                className={cn(
                                  "px-3 py-1 rounded-lg text-sm font-medium",
                                  topic.status === "completed"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : topic.status === "ongoing"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                )}
                              >
                                <option value="planned">Planned</option>
                                <option value="ongoing">Ongoing</option>
                                <option value="completed">Completed</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === "notes" && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Class Notes
                  </h2>
                  <button
                    onClick={() => setShowNoteForm(!showNoteForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                    Add Note
                  </button>
                </div>
                
                {showNoteForm && (
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                    <div className="space-y-4">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Write a note..."
                        rows={4}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveNote}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                        >
                          Save Note
                        </button>
                        <button
                          onClick={() => setShowNoteForm(false)}
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="p-6">
                  {notes.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">No notes added yet</p>
                  ) : (
                    <div className="space-y-4">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm text-slate-500">
                              {new Date(note.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-900 dark:text-white whitespace-pre-wrap">
                            {note.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
