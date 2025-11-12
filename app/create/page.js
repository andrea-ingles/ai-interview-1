// file: app/create/page.js
// Page where an admin can create a new interview
'use client'

import { memo, useState, useRef, useEffect } from 'react';
import { FaSave, FaPlus, FaTimesCircle, FaStar, FaArrowUp, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useRouter } from 'next/navigation'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuthContext } from '../../components/AuthProvider'
import { supabaseClient } from '../../lib/authClient'
import Navigation from '../../components/Navigation'

function AdminPageContent() {
  const [currentStep, setCurrentStep] = useState('Setup');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const chatAreaRef = useRef(null);
  
  const [interviewConfig, setInterviewConfig] = useState({
    jobTitle: '',
    companyName: '',
    companyCulture: '',
    analysisPrompts: [],
    nextSteps: '',
    timeLimit: 120
  });

  const defaultBasicQuestions = [
    { short_name: "Work authorization", question_text: "Can you legally work in the location?", position: 0, more:"Yes" },
    { short_name: "Availability", question_text: "When can you start?", position: 1, more: "Before than in 2 months." },
    { short_name: "Salary expectations", question_text: "What are your salary expectations for this role?", position: 2, more:"Less than 35K€" },
    { short_name: "In-office", question_text: "What are your preferences when it comes to working on-site versus remotely?", position: 3, more:"On-site" }    
  ];

  const defaultExperienceQuestions = [
    { short_name: "Achievement", question_text: "Describe your greatest professional achievement", tags_questions: ["check"], position: 0, more:"Did they tell any metrics? or did they tell what problem were they solving?" },
    { short_name: "Challenge", question_text: "How do you handle challenging situations at work?", tags_questions: ["check"], position: 1, more:"Are they thinking in a step by step mindset? Did they mention communication and/or compromise?" },
    { short_name: "Must-have", question_text: "Do you have the must-have skills/years of experience", tags_questions: ["check"], position: 2, more: "Did they mention business or specific technical skills? Did they say how many years of experience in Product management they have?" }
  ];

  const defaultSoftSkillsQuestions = [
    { question_text: "Communication & Clarity", tags_questions: ["check"], position: 0 },
    { question_text: "Problem-Solving & Critical Thinking", tags_questions: ["check"], position: 1 },
    { question_text: "Teamwork & Collaboration", tags_questions: ["check"], position: 2 },
    { question_text: "Adaptability & Learning Agility", tags_questions: ["check"], position: 3 }
  ];

  const defaultResumeQuestions = [
    {  short_name: "Last role", question_text: "Tell me about your current role or your last role", tags_questions: ["check"], position: 0 },
    {  short_name: "Accomplishment on last job", question_text: "What was your biggest accomplishment at your last job?", tags_questions: ["check"], position: 1 },
    {  short_name: "Reason for choosing last job", question_text: "Why did you choose your latest job position?", tags_questions: ["check"], position: 2 },
    {  short_name: "Tools on last job", question_text: "What technologies, tools or methodologies have you used in your last job that would be relevant for this position?", tags_questions: ["check"], position: 3 }
  ]

  const defaultMotivationQuestions = [
    { short_name: "Reason for leaving", question_text: "Why are you looking to leave or why did you leave your current role?", tags_questions: ["check"], position: 0 },
    { short_name: "Interest in role", question_text: "What attracted you to this position/company?", tags_questions: ["check"], position: 1 },
    { short_name: "Career goals", question_text: "What are your career goals?", tags_questions: ["check"], position: 2 }
  ]

  const defaultAnalysisPrompts = [
    "Rate the candidate's communication skills (1-10) and explain why",
    "Assess the candidate's enthusiasm and motivation for the role",
    "Evaluate the relevance of their experience to the position",
    "Identify any red flags or concerns",
    "Summarize their key strengths",
    "Provide an overall recommendation (Hire/Maybe/Pass) with reasoning"
  ]

  const [basicQuestionsConfig, setBasicQuestionsConfig] = useState([]);
  const [experienceQuestionsConfig, setExperienceQuestionsConfig] = useState([]);
  const [softSkillsQuestionsConfig, setSoftSkillsQuestionsConfig] = useState([]);
  const [resumeQuestionsConfig, setResumeQuestionsConfig] = useState(defaultResumeQuestions);
  const [motivationQuestionsConfig, setMotivationQuestionsConfig] = useState(defaultMotivationQuestions);
  
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [basicCompleted, setBasicCompleted] = useState(false);
  const [experienceCompleted, setExperienceCompleted] = useState(false);
  const [softSkillsCompleted, setSoftSkillsCompleted] = useState(false);
  const [cultureCompleted, setCultureCompleted] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [visibleMessages, setVisibleMessages] = useState({
    setup: 0,
    basic: 0,
    experience: 0,
    softSkills: 0,
    culture: 0
  });

  const router = useRouter()
  const { user } = useAuthContext()


  

  useEffect(() => {
    if (currentStep === 'Basic' && basicQuestionsConfig.length === 0) {
      setBasicQuestionsConfig(defaultBasicQuestions);
    }
    if (currentStep === 'Experience' && experienceQuestionsConfig.length === 0) {
      setExperienceQuestionsConfig(defaultExperienceQuestions);
    }
    if (currentStep === 'Soft-skills' && softSkillsQuestionsConfig.length === 0) {
      setSoftSkillsQuestionsConfig(defaultSoftSkillsQuestions);
    }
  }, [currentStep]);

  {/*useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [currentStep, setupCompleted, basicCompleted, experienceCompleted, softSkillsCompleted, cultureCompleted]);*/}


  // Auto-scroll when new block becomes visible, but only once per change
  const lastVisibleRef = useRef({});

  useEffect(() => {
    const area = chatAreaRef.current;
    if (!area) return;

    // Count total visible blocks
    const totalVisible = Object.values(visibleMessages).reduce((a, b) => a + b, 0);

    // Only scroll if new content appeared (not on re-render)
    if (lastVisibleRef.current.total !== totalVisible) {
      area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' });
      lastVisibleRef.current.total = totalVisible;
    }
  }, [visibleMessages]);

  useEffect(() => {
    const area = chatAreaRef.current;
    if (!area) return;

    const panels = [
      { id: 'setup-panel', step: 'Setup' },
      { id: 'basic-panel', step: 'Basic' },
      { id: 'experience-panel', step: 'Experience' },
      { id: 'soft-skills-panel', step: 'Soft-skills' },
      { id: 'culture-panel', step: 'Culture' },
    ];

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const scrollPos = area.scrollTop + area.clientHeight / 2;
        let active = currentStep;

        for (let i = panels.length - 1; i >= 0; i--) {
          const el = document.getElementById(panels[i].id);
          if (el && el.offsetTop <= scrollPos) {
            active = panels[i].step;
            break;
          }
        }

        if (active !== currentStep) setCurrentStep(active);
        ticking = false;
      });
    };

    area.addEventListener('scroll', handleScroll);
    return () => area.removeEventListener('scroll', handleScroll);
  }, [currentStep]);

  useEffect(() => {
    const stepMessageCounts = {
      'Setup': { key: 'setup', count: 3 },
      'Basic': { key: 'basic', count: 2 },
      'Experience': { key: 'experience', count: 2 },
      'Soft-skills': { key: 'softSkills', count: 2 },
      'Culture': { key: 'culture', count: 4 }
    };

    const stepConfig = stepMessageCounts[currentStep];
    if (!stepConfig) return;

    // Only initialize if messages for this step haven't been started yet
    if (visibleMessages[stepConfig.key] >0) return;

    // Show messages progressively
    const timers = [];
    for (let i = 1; i <= stepConfig.count; i++) {
      timers.push(
        setTimeout(() => {
          setVisibleMessages(prev => ({ ...prev, [stepConfig.key]: i }));
        }, i * 10)
      );
    }

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [currentStep]);

  const stepToPanelId = {
    'Setup': 'setup-panel',
    'Basic': 'basic-panel',
    'Experience': 'experience-panel',
    'Soft-skills': 'soft-skills-panel',
    'Culture': 'culture-panel'
  };
  

  const handleStepChange = (step) => {
    setCurrentStep(step);

    // Scroll to the beginning of the corresponding panel
    setTimeout(() => {
      const area = chatAreaRef.current;
      const panel = document.getElementById(stepToPanelId[step]);
      if (area && panel) area.scrollTo({ top: panel.offsetTop, behavior: 'smooth' });
    }, 50);
  };

  const handlePrevStep = () => {
    const steps = ['Setup', 'Basic', 'Experience', 'Soft-skills', 'Culture'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleNextStep = () => {
    const steps = ['Setup', 'Basic', 'Experience', 'Soft-skills', 'Culture'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleSetupSubmit = () => {
    if (interviewConfig.jobTitle && interviewConfig.companyName) {
      setSetupCompleted(true);
      setCurrentStep('Basic');
      console.log('CurrentStep should be Basic: ', currentStep)
    }
  };

  const handleBasicSubmit = () => {
    setBasicCompleted(true);
    setTimeout(() => setCurrentStep('Experience'), 500);
    console.log('CurrentStep should be Experience: ', currentStep)
  };

  const handleExperienceSubmit = () => {
    setExperienceCompleted(true);
    setTimeout(() => setCurrentStep('Soft-skills'), 500);
    console.log('CurrentStep should be SoftSKills: ', currentStep)
  };

  const handleSoftSkillsSubmit = () => {
    setSoftSkillsCompleted(true);
    setTimeout(() => setCurrentStep('Culture'), 500);
    console.log('CurrentStep should be Culture: ', currentStep)
  };

  const handleCultureSubmit = async () => {
    setCultureCompleted(true);
    console.log('Finished!')
    try {
      // Get the current user's session for the API call
      const { data: { session } } = await supabaseClient.auth.getSession()
      console.log('session :', session)

      if (!session) {
        console.error("No session found!")
      return
    }
    // STEP 1: Create interview without questions
      const interviewResponse  = await fetch('/api/admin/interviews/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          jobTitle: interviewConfig.jobTitle,
          companyName: interviewConfig.companyName,
          companyCulture: interviewConfig.companyCulture,
          analysisPrompts: interviewConfig.analysisPrompts.length > 0 ? interviewConfig.analysisPrompts : defaultAnalysisPrompts,
          keySkills: softSkillsQuestionsConfig,
          nextSteps: interviewConfig.nextSteps || "Thank you for completing the interview. We will review your responses and get back to you within 3-5 business days.",
          timeLimit: interviewConfig.timeLimit
        }),
      })
      console.log('Interview created without questions.')
      const interviewData = await interviewResponse.json()

      if (!interviewResponse.ok) {
        alert('Error creating interview: ' + (interviewData.error || 'Unknown error'))
        return
      }

      const interviewId = interviewData.interview.id
      const link = interviewData.interviewUrl
      console.log('Interview link created:' ,link)

      // STEP 2: Create questions with interview_id

      const allQuestions = [
        ...basicQuestionsConfig.map(q => ({ ...q, category: 'basic' })),
        ...experienceQuestionsConfig.map(q => ({ ...q, category: 'experience' })),
        ...resumeQuestionsConfig.map(q => ({ ...q, category: 'resume' })),
        ...motivationQuestionsConfig.map(q => ({ ...q, category: 'motivation' }))      
      ]

      console.log('All questions: ', allQuestions)
      const questionsResponse = await fetch('/api/admin/interviews/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          interview_id: interviewId,
          questions: allQuestions
        }),
      })

      const questionsData = await questionsResponse.json()

      if (!questionsResponse.ok) {
        alert('Interview created but error adding questions: ' + (questionsData.error || 'Unknown error'))
        return
      }

      // Success!
      setGeneratedLink(link)

      // Copy to clipboard
      await navigator.clipboard.writeText(link)
      alert(`Interview link created and copied to clipboard!\n${link}`)

    } catch (error) {
      console.error('Error:', error)
      alert('Error creating interview. Please check your configuration.')
    }
  }


  // Question management functions
  const addQuestion = (type) => {
    const configs = {
      'Basic': { state: basicQuestionsConfig, setState: setBasicQuestionsConfig, template: { short_name: "Title", question_text: "Enter the question here", more: "Short right answer here" } },
      'Experience': { state: experienceQuestionsConfig, setState: setExperienceQuestionsConfig, template: { short_name: "Title", question_text: "Enter the experience here", tags_questions: ["check"], more: "Enter questions or specific checks or information to focus the analysis." } },
      'Soft-skills': { state: softSkillsQuestionsConfig, setState: setSoftSkillsQuestionsConfig, template: { question_text: "Enter the soft-skill here", tags_questions: ["check"] } }
    };
    
    const config = configs[type];
    const newQuestion = { ...config.template, position: config.state.length };
    config.setState([...config.state, newQuestion]);
  };

  const removeQuestion = (type, index) => {
    const configs = {
      'Basic': { state: basicQuestionsConfig, setState: setBasicQuestionsConfig },
      'Experience': { state: experienceQuestionsConfig, setState: setExperienceQuestionsConfig },
      'Soft-skills': { state: softSkillsQuestionsConfig, setState: setSoftSkillsQuestionsConfig }
    };
    
    const config = configs[type];
    const newQuestions = config.state
      .filter((_, i) => i !== index)
      .map((q, i) => ({ ...q, position: i }));
    config.setState(newQuestions);
  };

  const toggleCritical = (type, index) => {
    const configs = {
      'Experience': { state: experienceQuestionsConfig, setState: setExperienceQuestionsConfig },
      'Soft-skills': { state: softSkillsQuestionsConfig, setState: setSoftSkillsQuestionsConfig }
    };
    
    const config = configs[type];
    const newQuestions = [...config.state];
    const currentTag = newQuestions[index].tags_questions[0];
    newQuestions[index] = {
      ...newQuestions[index],
      tags_questions: currentTag === "check" ? ["critical"] : ["check"]
    };
    config.setState(newQuestions);
  };

  const updateQuestion = (type, index, field, value) => {
    const configs = {
      'Basic': { state: basicQuestionsConfig, setState: setBasicQuestionsConfig },
      'Experience': { state: experienceQuestionsConfig, setState: setExperienceQuestionsConfig },
      'Soft-skills': { state: softSkillsQuestionsConfig, setState: setSoftSkillsQuestionsConfig }
    };
    
    const config = configs[type];
    const newQuestions = [...config.state];
    if (field === 'short_name' && value.length > 15) return;
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    config.setState(newQuestions);
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (type, dropIndex) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const configs = {
      'Basic': { state: basicQuestionsConfig, setState: setBasicQuestionsConfig },
      'Experience': { state: experienceQuestionsConfig, setState: setExperienceQuestionsConfig },
      'Soft-skills': { state: softSkillsQuestionsConfig, setState: setSoftSkillsQuestionsConfig }
    };
    
    const config = configs[type];
    const newQuestions = [...config.state];
    const draggedQuestion = newQuestions[draggedIndex];
    
    newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(dropIndex, 0, draggedQuestion);
    
    const reorderedQuestions = newQuestions.map((q, i) => ({ ...q, position: i }));
    config.setState(reorderedQuestions);
    setDraggedIndex(null);
  };

  const renderQuestionsList = (type, questions) => {
    const showStar = type === 'Experience' || type === 'Soft-skills';
    const showShortName = type !== 'Soft-skills';
    const showMore = type === 'Basic' || type === 'Experience';

    return (
      <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
        {questions.map((question, index) => (
          <div 
            key={index}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(type, index)}
            className={`group p-4 bg-muted/50 rounded-lg border border-border hover:border-primary/50 transition-all cursor-move ${
              draggedIndex === index ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start space-x-3 flex-1 min-w-0">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground text-xs font-bold rounded-full flex-shrink-0 mt-1">
                  {index + 1}
                </span>

                {showStar && (
                  <button
                    onClick={() => toggleCritical(type, index)}
                    className={`flex-shrink-0 mt-1 transition-all ${
                      question.tags_questions?.[0] === "critical"
                        ? 'text-primary scale-110'
                        : 'text-gray-300 hover:text-gray-400'
                    }`}
                    title={question.tags_questions?.[0] === "critical" ? "Critical" : "Regular"}
                  >
                    <FaStar size={16} />
                  </button>
                )}
                
                <div className="flex-1 min-w-0 space-y-2">
                  {showShortName && (
                    <input
                      type="text"
                      value={question.short_name}
                      onChange={(e) => updateQuestion(type, index, 'short_name', e.target.value)}
                      className="w-full bg-transparent border-b border-border focus:border-primary outline-none font-semibold text-foreground"
                      placeholder="Title"
                      maxLength={15}
                    />
                  )}
                  <input
                    type="text"
                    value={question.question_text}
                    onChange={(e) => updateQuestion(type, index, 'question_text', e.target.value)}
                    className="w-full bg-transparent border-b border-border focus:border-primary outline-none text-foreground"
                    placeholder={type === 'Soft-skills' ? "Enter the soft-skill here" : "Enter the question here"}
                  />
                  {showMore && (
                    <input
                      type="text"
                      value={question.more}
                      onChange={(e) => updateQuestion(type, index, 'more', e.target.value)}
                      className="w-full bg-transparent border-b border-border focus:border-primary outline-none font-semibold text-foreground"
                      placeholder={type === 'Basic' ? "Short right answer here" : "Enter questions or specific checks or information to focus the analysis."}
                      maxLength={30}
                    />
                  )}
                </div>
              </div>
              
              <button
                onClick={() => removeQuestion(type, index)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 flex-shrink-0"
              >
                <FaTimesCircle size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-muted/70 overflow-hidden">
      <Navigation />

      <div className="bg-muted/70 flex-1 flex flex-col overflow-hidden pr-2">
        {/* Top Panel */}
        <div className="bg-muted/70 px-4 py-3">
          <div className="relative flex items-center justify-between w-full gap-2 overflow-hidden">
            
            {/* Left: Job Title - Company Name */}
            <div className="flex items-center gap-2 min-w-0 truncate">
              <span className="text-lg font-semibold text-foreground">
                {interviewConfig.jobTitle || 'Job title'} - {interviewConfig.companyName || 'Company name'}
              </span>
            </div>

            {/* Middle: Interview Creation Navigation */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="hidden md:flex items-center gap-2">
                {['Setup', 'Basic', 'Experience', 'Soft-skills', 'Culture'].map((step, idx) => {
                  // Define visibility/unlock rules
                  const stepUnlocked =
                    step === 'Setup' ||
                    (step === 'Basic' && setupCompleted) ||
                    (step === 'Experience' && basicCompleted) ||
                    (step === 'Soft-skills' && experienceCompleted) ||
                    (step === 'Culture' && softSkillsCompleted);

                  return (
                    <div key={step} className="flex items-center">
                      <button
                        onClick={() => stepUnlocked && handleStepChange(step)}
                        disabled={!stepUnlocked}
                        className={`relative px-2 py-1 font-medium transition-colors ${
                          currentStep === step
                            ? 'text-primary after:content-[""] after:absolute after:left-0 after:bottom-0 after:w-full after:h-0.5 after:bg-primary after:rounded-full'
                            : stepUnlocked
                              ? 'hover:text-primary text-foreground'
                              : 'text-muted-foreground opacity-50 cursor-not-allowed'
                        }`}
                      >
                        {step}
                      </button>
                      {idx < 4 && <span className="text-muted-foreground mx-1">›</span>}
                    </div>
                  );
                })}
              </div>

              <div className="flex md:hidden items-center gap-3">
                <button onClick={handlePrevStep} className="p-1 rounded-full hover:bg-muted transition">
                  <FaChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-foreground">{currentStep}</span>
                <button onClick={handleNextStep} className="p-1 rounded-full hover:bg-muted transition">
                  <FaChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: Save Button (hidden for now) */}
            <div className="flex items-center gap-3 ml-auto">
              {/*<button
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all hidden"
                title="Save interview"
              >
                <FaSave size={16} />
              </button>*/}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div ref={chatAreaRef} className="flex-1 overflow-y-auto p-0">
          <div 
            className="content-page w-full sm:px-6 py-4 sm:py-6 glass-effect shadow-sm border-border overflow-y-auto"
            style={{ 
              minHeight: 'calc(100vh - 70px)', 
              marginBottom: 'clamp(0.25rem, 2vw, 0.5rem)',
            }}
          >
            <div className="max-w-4xl mx-auto flex flex-col space-y-6 pb-24">
              {/*flex flex-col justify-end space-y-6 space-y-reverse min-h-[60vh]*/}
              {/* Setup Panel */}
              {visibleMessages.setup >= 0 && (
                <div id="setup-panel" className="space-y-6">
        
                    <div className="bg-transparent p-4 rounded-lg">
                      {visibleMessages.setup >= 1 && (
                        <p className="text-foreground text-base">Hi! Let's start configuring your interview.</p>
                      )}
                      {visibleMessages.setup >= 2 && (
                        <p className="text-foreground text-base">Enter below the Job title, Company name and the next steps after the completion of the interview:</p>
                      )}
                    </div>

                  {visibleMessages.setup >= 3 && (
                    <div className="bg-muted/50 p-6 rounded-lg border border-border space-y-4 relative">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">Job Title *</label>
                        <input
                          type="text"
                          value={interviewConfig.jobTitle}
                          onChange={(e) => setInterviewConfig({...interviewConfig, jobTitle: e.target.value})}
                          className="w-full input-enhanced h-12 bg-background"
                          placeholder="e.g., Frontend Developer"
                        />
                      </div>
                  

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">Company Name *</label>
                        <input
                          type="text"
                          value={interviewConfig.companyName}
                          onChange={(e) => setInterviewConfig({...interviewConfig, companyName: e.target.value})}
                          className="w-full input-enhanced h-12 bg-background"
                          placeholder="Your Company Name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">Next Steps Message</label>
                        <textarea
                          value={interviewConfig.nextSteps}
                          onChange={(e) => setInterviewConfig({...interviewConfig, nextSteps: e.target.value})}
                          className="w-full input-enhanced min-h-[100px] resize-none bg-background"
                          placeholder="Thank you for completing the interview..."
                        />
                      </div>

                      <button
                        onClick={handleSetupSubmit}
                        disabled={setupCompleted || !interviewConfig.jobTitle || !interviewConfig.companyName}
                        className="absolute -bottom-3 -right-3 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110"
                      >
                        <FaArrowUp size={20} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Basic Panel */}
              {setupCompleted && (
                <div id="basic-panel" className="space-y-6">
                  {visibleMessages.basic >= 1 && (
                    <div className="bg-transparent p-4 rounded-lg">
                      <p className="text-foreground text-base">Now, let's choose which basic questions do you want to check before entering to the main interview:</p>
                    </div>
                  )}
                  {visibleMessages.basic >= 2 && (
                    <div className="bg-muted/50 p-6 rounded-lg border border-border relative">
                  
                      <div className="flex justify-end mb-4">
                        <button
                          onClick={() => addQuestion('Basic')}
                          className="p-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                          title="Add Question"
                        >
                          <FaPlus size={16} />
                        </button>
                      </div>

                      {renderQuestionsList('Basic', basicQuestionsConfig)}

                      <button
                        onClick={handleBasicSubmit}
                        disabled={basicCompleted}
                        className="absolute -bottom-3 -right-3 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110"
                      >
                        <FaArrowUp size={20} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Experience Panel */}
              {basicCompleted && (
                <div id="experience-panel" className="space-y-6">
                  {visibleMessages.experience >= 1 && (
                    <div className="bg-transparent p-4 rounded-lg">
                      <p className="text-foreground text-base">What relevant experience does the candidate must have and which is a nice to have? Click the Star button to make it a must-have.</p>
                    </div>
                  )}
                  {visibleMessages.experience >= 2 && (
                    <div className="bg-muted/50 p-6 rounded-lg border border-border relative">
                    
                      <div className="flex justify-end mb-4">
                        <button
                          onClick={() => addQuestion('Experience')}
                          className="p-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                          title="Add Question"
                        >
                          <FaPlus size={16} />
                        </button>
                      </div>

                      {renderQuestionsList('Experience', experienceQuestionsConfig)}

                      <button
                        onClick={handleExperienceSubmit}
                        disabled={experienceCompleted}
                        className="absolute -bottom-3 -right-3 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110"
                      >
                        <FaArrowUp size={20} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Soft-skills Panel */}
              {experienceCompleted && (
                <div id="soft-skills-panel" className="space-y-6">
                  {visibleMessages.softSkills >= 1 && (
                    <div className="bg-transparent p-4 rounded-lg">
                      <p className="text-foreground text-base">What soft-skills are critical and which are nice to have for this role? Click the Star button to make them a must-have.</p>
                    </div>
                  )}
                  
                  {visibleMessages.softSkills >= 2 && (
                    <div className="bg-muted/50 p-6 rounded-lg border border-border relative">
                    
                      <div className="flex justify-end mb-4">
                        <button
                          onClick={() => addQuestion('Soft-skills')}
                          className="p-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                          title="Add Question"
                        >
                          <FaPlus size={16} />
                        </button>
                      </div>

                      {renderQuestionsList('Soft-skills', softSkillsQuestionsConfig)}

                      <button
                        onClick={handleSoftSkillsSubmit}
                        disabled={softSkillsCompleted}
                        className="absolute -bottom-3 -right-3 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110"
                      >
                        <FaArrowUp size={20} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Culture Panel */}
              {softSkillsCompleted && (
                <div id="culture-panel" className="space-y-6">
                  {visibleMessages.culture >= 1 && (
                    <div className="bg-transparent p-4 rounded-lg">
                      <p className="text-foreground text-base">What is the company culture?</p>
                    </div>
                  )}
                  
                  {visibleMessages.culture >= 2 && (
                    <div className="bg-muted/50 p-6 rounded-lg border border-border space-y-4 relative">
                      
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">
                          Company Culture & Values
                        </label>
                        <textarea
                          value={interviewConfig.companyCulture}
                          onChange={(e) => setInterviewConfig({...interviewConfig, companyCulture: e.target.value})}
                          className="w-full input-enhanced min-h-[90px] resize-none bg-background"
                          placeholder="Describe the company's culture (e.g. ownership, innovation, transparency, speed...)"
                        />
                      </div>

                      <button
                        onClick={handleCultureSubmit}
                        disabled={cultureCompleted}
                        className="absolute -bottom-3 -right-3 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-110"
                      >
                        <FaArrowUp size={20} />
                      </button>
                    </div>
                  )}

                  {generatedLink && (
                    <div className="bg-green-50 p-6 rounded-lg border border-green-200 animate-fade-in">
                      <p className="text-green-800 text-base font-semibold mb-2">The creation of this interview has been successful!</p>
                      {visibleMessages.culture >= 3 && (
                        <p className="text-green-700 mb-3">Link copied to clipboard.</p>
                      )}
                      {visibleMessages.culture >= 4 && (
                        <div className="p-3 bg-white rounded-md border border-green-300">
                          <code className="text-sm text-gray-700 break-all">{generatedLink}</code>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-fade-in {
          animation: appearFromBottom 0.6s ease-out;
        }

        @keyframes appearFromBottom {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .input-enhanced {
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          padding: 0.75rem;
          transition: all 0.2s;
        }

        .input-enhanced:focus {
          outline: none;
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
        }

        .glass-effect {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute adminOnly={true}>
      <AdminPageContent />
    </ProtectedRoute>
  )
}