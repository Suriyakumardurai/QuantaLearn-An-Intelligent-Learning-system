
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Course, User, Module, Quiz, Question, QuizType, GenerationState, Badge, LearningPath } from '../types';
import { generateCourseOutline, generateModuleContentAndQuiz, clarifyDoubt, generateLearningPathOutline, generateMockTest } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { BrainCircuitIcon, BookOpenIcon, CheckCircleIcon, AwardIcon, LoaderIcon, KeyIcon, WorldLoader, LightbulbIcon, DocumentTextIcon, LockClosedIcon, ArrowPathIcon, QuestionMarkCircleIcon, UserCircleIcon, MenuIcon, ChevronDownIcon, RectangleStackIcon, PlayIcon, PauseIcon, StopIcon } from './Icons';

// Declare marked and MathJax for TypeScript since they're loaded from a script tag
declare global {
    interface Window {
        marked: {
            parse: (markdown: string) => string;
        };
        MathJax: {
            typeset: () => void;
        };
    }
}

interface MainAppProps {
  user: User;
  logout: () => void;
  updateUser: (updatedUserData: Partial<User>) => void;
}

const ApiKeySetup: React.FC<{
    updateUser: (updatedUserData: Partial<User>) => void;
}> = ({ updateUser }) => {
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveKey = () => {
        if (!apiKeyInput.trim()) return;
        setIsSaving(true);
        // No real validation, just save and let the first API call fail if it's bad
        setTimeout(() => {
            updateUser({ apiKey: apiKeyInput.trim() });
            setIsSaving(false);
        }, 500);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-primary">
            <div className="w-full max-w-lg mx-auto bg-secondary p-8 rounded-2xl shadow-xl border border-border-color text-center">
                <KeyIcon className="w-12 h-12 text-accent mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-text-primary">Set Up Your API Key</h1>
                <p className="text-text-secondary mt-2 mb-6">
                    QuantaLearn requires your personal Google Gemini API key to generate content. This key is stored securely in your browser and is used for all AI interactions.
                </p>
                <div className="space-y-4">
                    <input
                        type="password"
                        placeholder="Enter your Gemini API Key"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        className="w-full bg-primary p-3 rounded-lg border border-border-color focus:ring-2 focus:ring-accent focus:outline-none text-center"
                    />
                    <button
                        onClick={handleSaveKey}
                        disabled={isSaving || !apiKeyInput.trim()}
                        className="w-full bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-highlight transition-all duration-300 flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <LoaderIcon /> : 'Save & Start Learning'}
                    </button>
                </div>
                <p className="text-xs text-text-secondary mt-4">
                    Don't have a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:text-highlight">Get one from Google AI Studio</a>.
                </p>
            </div>
        </div>
    );
};


const Sidebar: React.FC<{
    isOpen: boolean;
    courses: Course[];
    learningPaths: LearningPath[];
    activeItemId: string | null;
    setView: (view: 'dashboard' | 'create-hub' | 'course' | 'path') => void;
    setActiveCourse: (course: Course | null) => void;
    setActivePath: (path: LearningPath | null) => void;
}> = ({ isOpen, courses, learningPaths, activeItemId, setView, setActiveCourse, setActivePath }) => {
    
    const handleCourseClick = (course: Course) => {
        setActivePath(null);
        setActiveCourse(course);
        setView('course');
    };

    const handlePathClick = (path: LearningPath) => {
        setActiveCourse(null);
        setActivePath(path);
        setView('path');
    }

    const handleDashboardClick = () => {
        setActiveCourse(null);
        setActivePath(null);
        setView('dashboard');
    }

    return (
        <aside className={`fixed top-0 left-0 w-72 bg-secondary flex flex-col h-screen border-r border-border-color p-4 flex-shrink-0 z-30 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center space-x-3 mb-8 px-2 pt-4">
                <BrainCircuitIcon className="w-8 h-8 text-accent"/>
                <h1 className="text-2xl font-bold text-text-primary">QuantaLearn</h1>
            </div>

            <nav className="flex-1 overflow-y-auto pr-2 space-y-2">
                <button onClick={() => setView('create-hub')} className="w-full bg-accent text-white font-bold py-2 px-3 rounded-lg hover:bg-highlight transition-all duration-300 shadow-sm hover:shadow-md text-left flex items-center mb-4">
                   <span className="text-xl mr-2">+</span> New Course
                </button>
                <h2 onClick={handleDashboardClick} className="px-2 text-sm font-semibold text-text-secondary uppercase tracking-wider mb-2 cursor-pointer">My Learning</h2>
                <ul className="space-y-1">
                    {learningPaths.map(path => (
                         <li key={path.id}>
                            <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); handlePathClick(path); }}
                                className={`block w-full text-left p-2 rounded-md font-medium text-sm transition-colors truncate ${activeItemId === path.id ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-primary'}`}
                            >
                                {path.title}
                            </a>
                        </li>
                    ))}
                    {courses.map(course => (
                        <li key={course.id}>
                            <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); handleCourseClick(course); }}
                                className={`block w-full text-left p-2 rounded-md font-medium text-sm transition-colors truncate ${activeItemId === course.id ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-primary'}`}
                            >
                                {course.title}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};

const ProfileDropdown: React.FC<{
    user: User;
    logout: () => void;
    setView: (view: 'profile') => void;
}> = ({ user, logout, setView }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center space-x-2">
                 <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                </div>
                <span className="font-semibold text-text-primary hidden md:inline">{user.name || user.email}</span>
                <ChevronDownIcon className="w-5 h-5 text-text-secondary"/>
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-secondary rounded-lg shadow-lg border border-border-color py-1 z-30">
                    <a href="#" onClick={(e) => {e.preventDefault(); setView('profile'); setIsOpen(false);}} className="block px-4 py-2 text-sm text-text-primary hover:bg-primary">My Profile</a>
                    <a href="#" onClick={(e) => {e.preventDefault(); logout();}} className="block px-4 py-2 text-sm text-text-primary hover:bg-primary">Logout</a>
                </div>
            )}
        </div>
    );
};

const Header: React.FC<{
    toggleSidebar: () => void;
    user: User;
    logout: () => void;
    setView: (view: 'profile') => void;
}> = ({ toggleSidebar, user, logout, setView }) => {
    return (
        <header className="bg-secondary/80 backdrop-blur-sm border-b border-border-color h-20 flex-shrink-0 flex items-center justify-between px-8 sticky top-0 z-10">
            <div className="flex items-center">
                <button onClick={toggleSidebar} className="p-2 -ml-2 text-text-secondary hover:text-text-primary">
                    <MenuIcon className="w-6 h-6"/>
                </button>
            </div>
             <ProfileDropdown user={user} logout={logout} setView={setView} />
        </header>
    );
};


const Breadcrumbs: React.FC<{
    view: string;
    activePath: LearningPath | null;
    activeCourse: Course | null;
    activeModule: { module: Module, index: number } | null;
    setView: (view: 'dashboard' | 'path' | 'course' | 'module') => void;
    setActivePath: (path: LearningPath | null) => void;
    setActiveCourse: (course: Course | null) => void;
}> = ({ view, activePath, activeCourse, activeModule, setView, setActivePath, setActiveCourse }) => {
    
    const handleDashboardClick = () => {
        setActiveCourse(null);
        setActivePath(null);
        setView('dashboard');
    }

    const handlePathClick = () => {
        setActiveCourse(null);
        setView('path');
    }

    const handleCourseClick = () => {
        setView('course');
    }

    if (view === 'profile') {
        return (
             <nav className="mb-6 text-sm text-text-secondary font-medium">
                <ol className="list-none p-0 inline-flex">
                    <li>
                        <a href="#" onClick={(e) => { e.preventDefault(); handleDashboardClick(); }} className="hover:text-accent">My Learning</a>
                    </li>
                    <li className="flex items-center">
                        <span className="mx-2">/</span>
                        <span className="text-text-primary">My Profile</span>
                    </li>
                </ol>
            </nav>
        )
    }

    return (
        <nav className="mb-6 text-sm text-text-secondary font-medium">
            <ol className="list-none p-0 inline-flex flex-wrap">
                <li>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleDashboardClick(); }} className="hover:text-accent">My Learning</a>
                </li>
                {activePath && (
                     <li className="flex items-center">
                        <span className="mx-2">/</span>
                        <a href="#" onClick={(e) => { e.preventDefault(); handlePathClick(); }} className={`hover:text-accent truncate max-w-[150px] md:max-w-xs ${!activeCourse ? 'text-text-primary' : ''}`}>{activePath.title}</a>
                    </li>
                )}
                {activeCourse && (
                    <li className="flex items-center">
                        <span className="mx-2">/</span>
                        <a href="#" onClick={(e) => { e.preventDefault(); handleCourseClick(); }} className={`hover:text-accent truncate max-w-[150px] md:max-w-xs ${!activeModule ? 'text-text-primary' : ''}`}>{activeCourse.title}</a>
                    </li>
                )}
                {activeCourse && activeModule && ['module', 'quiz', 'quiz_results', 'quiz_answers', 'mock_test', 'mock_test_results'].includes(view) && (
                     <li className="flex items-center">
                        <span className="mx-2">/</span>
                        <span className="text-text-primary truncate max-w-[150px] md:max-w-xs">{activeModule.module.title}</span>
                    </li>
                )}
            </ol>
        </nav>
    )
};


const Dashboard: React.FC<{
    courses: Course[];
    learningPaths: LearningPath[];
    setView: (view: 'create-hub' | 'course' | 'path') => void;
    setActiveCourse: (course: Course) => void;
    setActivePath: (path: LearningPath) => void;
}> = ({ courses, learningPaths, setView, setActiveCourse, setActivePath }) => (
    <div>
        <h2 className="text-3xl font-bold text-text-primary mb-6">My Learning Dashboard</h2>
        
        <div className="space-y-8">
            {learningPaths.length > 0 && (
                <div>
                    <h3 className="text-xl font-bold text-text-primary mb-4">Learning Paths</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {learningPaths.map(path => (
                            <div key={path.id} onClick={() => { setActivePath(path); setView('path');}} className="bg-secondary p-6 rounded-xl shadow-md cursor-pointer hover:shadow-lg hover:border-accent border border-border-color transition-all duration-300 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-accent mb-2">{path.title}</h3>
                                    <p className="text-text-secondary text-sm mb-4 h-10 overflow-hidden">{path.description}</p>
                                </div>
                                <div className="flex items-center text-sm text-text-secondary mt-2">
                                    <RectangleStackIcon className="w-5 h-5 mr-2 text-accent"/>
                                    <span>Contains {path.courses.length} courses</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {courses.length > 0 && (
                 <div>
                    <h3 className="text-xl font-bold text-text-primary mb-4">Single Courses</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map(course => (
                            <div key={course.id} onClick={() => { setActiveCourse(course); setView('course');}} className="bg-secondary p-6 rounded-xl shadow-md cursor-pointer hover:shadow-lg hover:border-accent border border-border-color transition-all duration-300">
                                <h3 className="text-xl font-bold text-accent mb-2">{course.title}</h3>
                                <p className="text-text-secondary text-sm mb-4 h-10 overflow-hidden">{course.description}</p>
                                {course.badge ? <div className="flex items-center text-green-500"><AwardIcon className="w-5 h-5 mr-2" /> Score: {course.badge.score}%</div> : <div className="h-[28px]"></div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
        
        {courses.length === 0 && learningPaths.length === 0 && (
            <div className="text-center py-12 bg-secondary rounded-xl border border-border-color">
                 <BrainCircuitIcon className="w-16 h-16 text-accent/50 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-text-primary">Welcome to your Dashboard!</h3>
                <p className="text-text-secondary mt-2">You haven't started any courses yet.</p>
                <p className="text-text-secondary mt-1">Click '+ New Course' in the sidebar to begin your journey.</p>
            </div>
        )}
    </div>
);

const CreationHub: React.FC<{ setView: (view: 'dashboard' | 'create-topic' | 'create-document' | 'create-path') => void }> = ({ setView }) => (
    <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-text-primary">Create Your Next Learning Path</h2>
            <p className="text-text-secondary mt-2">How would you like to begin?</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div onClick={() => setView('create-topic')} className="bg-secondary p-8 rounded-xl shadow-md hover:shadow-xl border border-border-color hover:border-accent cursor-pointer transition-all duration-300 text-center flex flex-col items-center">
                <LightbulbIcon className="w-16 h-16 text-accent mb-4"/>
                <h3 className="text-2xl font-bold text-text-primary mb-2">From a Topic</h3>
                <p className="text-text-secondary">Tell us what you want to learn, and we'll design a comprehensive course for you.</p>
            </div>
            <div onClick={() => setView('create-document')} className="bg-secondary p-8 rounded-xl shadow-md hover:shadow-xl border border-border-color hover:border-accent cursor-pointer transition-all duration-300 text-center flex flex-col items-center">
                <DocumentTextIcon className="w-16 h-16 text-accent mb-4"/>
                <h3 className="text-2xl font-bold text-text-primary mb-2">From Your Notes</h3>
                <p className="text-text-secondary">Upload a file or paste text to generate a course from your material.</p>
            </div>
             <div onClick={() => setView('create-path')} className="bg-secondary p-8 rounded-xl shadow-md hover:shadow-xl border border-border-color hover:border-accent cursor-pointer transition-all duration-300 text-center flex flex-col items-center">
                <RectangleStackIcon className="w-16 h-16 text-accent mb-4"/>
                <h3 className="text-2xl font-bold text-text-primary mb-2">For a Major Goal</h3>
                <p className="text-text-secondary">Tackle a big goal (e.g., GATE, UPSC) with a structured path of multiple courses.</p>
            </div>
        </div>
    </div>
);

const TopicCreator: React.FC<{
    handleCreateCourse: (topic: string, level: string, fileContent?: {mimeType: string, data: string}) => Promise<void>;
    setView: (view: 'create-hub') => void;
    loading: boolean;
    setError: (error: string | null) => void;
}> = ({ handleCreateCourse, setView, loading, setError }) => {
    const [topic, setTopic] = useState('');
    const [level, setLevel] = useState('Beginner');
    
    const handleSubmit = () => {
        if (!topic) {
            setError("Please provide a course topic or exam name.");
            return;
        }
        handleCreateCourse(topic, level);
    }

    return (
        <div className="max-w-2xl mx-auto">
            <button onClick={() => setView('create-hub')} className="mb-6 text-accent font-semibold">&larr; Back to Creation Hub</button>
            <div className="bg-secondary p-8 rounded-xl shadow-lg border border-border-color">
                 <div className="text-center mb-6">
                    <LightbulbIcon className="w-12 h-12 text-accent mx-auto mb-3"/>
                    <h2 className="text-2xl font-bold">Design a Course by Topic</h2>
                </div>
                <div className="space-y-6">
                    <div>
                        <label className="block text-text-secondary mb-2 font-medium">Course Topic or Exam Name</label>
                        <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Quantum Physics or GATE Exam" className="w-full bg-primary p-3 rounded-lg border border-border-color focus:ring-2 focus:ring-accent focus:outline-none"/>
                    </div>
                    <div>
                        <label className="block text-text-secondary mb-2 font-medium">Your Current Knowledge Level</label>
                        <select value={level} onChange={e => setLevel(e.target.value)} className="w-full bg-primary p-3 rounded-lg border border-border-color focus:ring-2 focus:ring-accent focus:outline-none">
                            <option>Beginner</option>
                            <option>Intermediate</option>
                            <option>Advanced</option>
                        </select>
                    </div>
                    <button onClick={handleSubmit} disabled={loading} className="w-full bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-highlight transition-all duration-300 flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {loading ? <LoaderIcon /> : 'Generate Course Outline'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const PathCreator: React.FC<{
    handleCreatePath: (goal: string, level: string) => Promise<void>;
    setView: (view: 'create-hub') => void;
    loading: boolean;
    setError: (error: string | null) => void;
}> = ({ handleCreatePath, setView, loading, setError }) => {
    const [goal, setGoal] = useState('');
    const [level, setLevel] = useState('Beginner');
    
    const handleSubmit = () => {
        if (!goal) {
            setError("Please provide a major goal (e.g., GATE 2025).");
            return;
        }
        handleCreatePath(goal, level);
    }

    return (
        <div className="max-w-2xl mx-auto">
            <button onClick={() => setView('create-hub')} className="mb-6 text-accent font-semibold">&larr; Back to Creation Hub</button>
            <div className="bg-secondary p-8 rounded-xl shadow-lg border border-border-color">
                 <div className="text-center mb-6">
                    <RectangleStackIcon className="w-12 h-12 text-accent mx-auto mb-3"/>
                    <h2 className="text-2xl font-bold">Design a Learning Path</h2>
                </div>
                <div className="space-y-6">
                    <div>
                        <label className="block text-text-secondary mb-2 font-medium">Major Goal</label>
                        <input type="text" value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g., Pass the GATE 2025 Exam" className="w-full bg-primary p-3 rounded-lg border border-border-color focus:ring-2 focus:ring-accent focus:outline-none"/>
                    </div>
                    <div>
                        <label className="block text-text-secondary mb-2 font-medium">Your Current Knowledge Level</label>
                        <select value={level} onChange={e => setLevel(e.target.value)} className="w-full bg-primary p-3 rounded-lg border border-border-color focus:ring-2 focus:ring-accent focus:outline-none">
                            <option>Beginner</option>
                            <option>Intermediate</option>
                            <option>Advanced</option>
                        </select>
                    </div>
                    <button onClick={handleSubmit} disabled={loading} className="w-full bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-highlight transition-all duration-300 flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {loading ? <LoaderIcon /> : 'Generate Learning Path'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const DocumentCreator: React.FC<{
    handleCreateCourse: (topic: string, level: string, fileContent: {mimeType: string, data: string}) => Promise<void>;
    setView: (view: 'create-hub') => void;
    loading: boolean;
    setError: (error: string | null) => void;
}> = ({ handleCreateCourse, setView, loading, setError }) => {
    const [level, setLevel] = useState('Beginner');
    const [file, setFile] = useState<File | null>(null);
    const [fileText, setFileText] = useState('');
    
    const handleSubmit = async () => {
        if (!file && !fileText) {
            setError("Please upload a file or paste some text.");
            return;
        }
        
        let filePayload;
        let topic = "Custom Material Course";

        try {
            if (file) {
                const base64 = await fileToBase64(file);
                filePayload = { mimeType: file.type, data: base64 };
                topic = file.name;
            } else if (fileText) {
                filePayload = { mimeType: 'text/plain', data: fileText };
            }

            if (filePayload) {
                handleCreateCourse(topic, level, filePayload);
            }
        } catch(e: any) {
            setError("Failed to process file: " + e.message);
        }
    };

    return (
         <div className="max-w-2xl mx-auto">
            <button onClick={() => setView('create-hub')} className="mb-6 text-accent font-semibold">&larr; Back to Creation Hub</button>
            <div className="bg-secondary p-8 rounded-xl shadow-lg border border-border-color">
                 <div className="text-center mb-6">
                    <DocumentTextIcon className="w-12 h-12 text-accent mx-auto mb-3"/>
                    <h2 className="text-2xl font-bold">Learn from Your Notes</h2>
                </div>
                <div className="space-y-6">
                    <div>
                        <label className="block text-text-secondary mb-2 font-medium">Upload File</label>
                        <div className="mt-2 flex justify-center rounded-lg border border-dashed border-border-color px-6 py-10">
                            <div className="text-center">
                                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                                <div className="mt-4 flex text-sm leading-6 text-gray-600">
                                    <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-semibold text-accent focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 hover:text-highlight">
                                    <span>Upload a file</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*,.txt,.pdf,.docx,.pptx,.xlsx" onChange={e => setFile(e.target.files ? e.target.files[0] : null)}/>
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs leading-5 text-gray-600">Image, TXT, PDF, DOCX, PPTX, XLSX</p>
                                {file && <p className="text-sm mt-2 text-green-600">{file.name}</p>}
                            </div>
                        </div>
                    </div>
                    <div className="text-center text-text-secondary font-semibold">OR</div>
                    <div>
                        <label className="block text-text-secondary mb-2 font-medium">Paste Text</label>
                        <textarea value={fileText} onChange={e => setFileText(e.target.value)} rows={5} placeholder="Paste content from your study materials here..." className="w-full bg-primary p-3 rounded-lg border border-border-color focus:ring-2 focus:ring-accent focus:outline-none"/>
                    </div>
                     <div>
                        <label className="block text-text-secondary mb-2 font-medium">Your Current Knowledge Level</label>
                        <select value={level} onChange={e => setLevel(e.target.value)} className="w-full bg-primary p-3 rounded-lg border border-border-color focus:ring-2 focus:ring-accent focus:outline-none">
                            <option>Beginner</option>
                            <option>Intermediate</option>
                            <option>Advanced</option>
                        </select>
                    </div>
                    <button onClick={handleSubmit} disabled={loading} className="w-full bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-highlight transition-all duration-300 flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed">
                        {loading ? <LoaderIcon /> : 'Generate Course Outline'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const PathView: React.FC<{
    activePath: LearningPath;
    setView: (view: 'course') => void;
    setActiveCourse: (course: Course) => void;
}> = ({ activePath, setView, setActiveCourse }) => {

    const handleCourseClick = (course: Course, index: number) => {
        if (index <= activePath.unlockedCourseIndex) {
            setActiveCourse(course);
            setView('course');
        }
    }

    return (
        <div>
            <h2 className="text-3xl font-bold mb-2">{activePath.title}</h2>
            <p className="text-text-secondary mb-6">{activePath.description}</p>
            
            <div className="space-y-4">
                {activePath.courses.map((course, index) => {
                    const isLocked = index > activePath.unlockedCourseIndex;
                    const isCurrent = index === activePath.unlockedCourseIndex;

                    return (
                        <div 
                            key={index} 
                            onClick={() => handleCourseClick(course, index)}
                            className={`p-4 rounded-lg flex justify-between items-center transition-all duration-300 border ${
                                !isLocked ? 'bg-secondary cursor-pointer hover:border-accent hover:shadow-md border-border-color' : 'bg-primary border-border-color'
                            } ${isLocked ? 'opacity-50' : ''}`}
                        >
                            <div className="flex items-center">
                                <div className="mr-4 text-accent flex-shrink-0">
                                    {isLocked ? <LockClosedIcon className="w-5 h-5" /> : course.isCompleted ? <CheckCircleIcon className="w-5 h-5 text-green-500"/> : <BookOpenIcon className="w-5 h-5"/>}
                                </div>
                                <div>
                                    <h4 className="font-bold text-text-primary">{course.title}</h4>
                                    <p className="text-sm text-text-secondary">{course.description}</p>
                                </div>
                            </div>
                           
                           <div className="ml-4 flex-shrink-0">
                                {isLocked ? null : 
                                 course.isCompleted ? (
                                     <div className="text-green-600 font-semibold text-sm">Completed</div>
                                 ) : 
                                 isCurrent ? (
                                    <div className="text-accent font-semibold text-sm flex items-center">
                                        Start Course &rarr;
                                    </div>
                                 ) : null
                                }
                           </div>

                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const CourseView: React.FC<{
    activeCourse: Course;
    setView: (view: 'module' | 'mock_test') => void;
    setActiveModule: (module: Module, index: number) => void;
    handleGenerateModule: (moduleIndex: number) => void;
    handleGenerateMockTest: () => void;
}> = ({ activeCourse, setView, setActiveModule, handleGenerateModule, handleGenerateMockTest }) => {

    const allModulesCompleted = activeCourse.modules.every(m => m.isCompleted);

    return (
        <div>
            <h2 className="text-3xl font-bold mb-2">{activeCourse.title}</h2>
            <p className="text-text-secondary mb-6">{activeCourse.description}</p>
            
            <div className="space-y-4">
                {activeCourse.modules.map((module, index) => {
                    const isLocked = index > activeCourse.unlockedModuleIndex;
                    const isCurrent = index === activeCourse.unlockedModuleIndex;

                    return (
                        <div 
                            key={index} 
                            onClick={() => { if(module.generationState === GenerationState.READY) { setActiveModule(module, index); setView('module'); } }} 
                            className={`p-4 rounded-lg flex justify-between items-center transition-all duration-300 border ${
                                module.generationState === GenerationState.READY ? 'bg-secondary cursor-pointer hover:border-accent hover:shadow-md border-border-color' : 'bg-primary border-border-color'
                            } ${isLocked ? 'opacity-50' : ''}`}
                        >
                            <div className="flex items-center">
                                <div className="mr-4 text-accent flex-shrink-0">
                                    {isLocked ? <LockClosedIcon className="w-5 h-5" /> : module.isCompleted ? <CheckCircleIcon className="w-5 h-5 text-green-500"/> : <BookOpenIcon className="w-5 h-5"/>}
                                </div>
                                <div>
                                    <h4 className="font-bold text-text-primary">{module.title}</h4>
                                    <p className="text-sm text-text-secondary">{module.objective}</p>
                                </div>
                            </div>
                           
                           <div className="ml-4 flex-shrink-0">
                                {isLocked ? null : 
                                 module.isCompleted ? (
                                     <div className="text-green-600 font-semibold text-sm">Completed</div>
                                 ) : 
                                 module.generationState === GenerationState.READY ? (
                                    <div className="text-accent font-semibold text-sm flex items-center">
                                        Start Module &rarr;
                                    </div>
                                 ) :
                                 isCurrent ? (
                                    module.generationState === GenerationState.GENERATING ? (
                                        <div className="flex items-center space-x-2 text-text-secondary">
                                            <LoaderIcon className="w-5 h-5" />
                                            <span className="text-sm font-semibold">Generating...</span>
                                        </div>
                                    ) :
                                    module.generationState === GenerationState.FAILED ? (
                                        <button onClick={(e) => { e.stopPropagation(); handleGenerateModule(index); }} className="text-red-500 hover:text-red-700"><ArrowPathIcon className="w-6 h-6"/></button>
                                    ) : (
                                        <button onClick={(e) => { e.stopPropagation(); handleGenerateModule(index); }} className="bg-accent text-white font-semibold py-2 px-4 rounded-lg hover:bg-highlight text-sm">Generate Module</button>
                                    )
                                 ) : null
                                }
                           </div>

                        </div>
                    );
                })}
            </div>

            {allModulesCompleted && (
                <div className="mt-8 pt-8 border-t border-border-color">
                    <div className="bg-secondary p-6 rounded-lg border border-border-color text-center">
                        <AwardIcon className="w-12 h-12 text-accent mx-auto mb-3" />
                        <h3 className="text-xl font-bold text-text-primary">Final Assessment</h3>
                        <p className="text-text-secondary mt-2 mb-4">You've completed all modules! Take the final mock test to earn your skill badge.</p>
                        
                        {activeCourse.mockTestState === GenerationState.GENERATING ? (
                            <div className="flex items-center justify-center space-x-2 text-text-secondary">
                                <LoaderIcon className="w-5 h-5" />
                                <span className="text-sm font-semibold">Generating Your Mock Test...</span>
                            </div>
                        ) : activeCourse.mockTestState === GenerationState.FAILED ? (
                             <button onClick={handleGenerateMockTest} className="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 text-sm">Generation Failed. Retry?</button>
                        ) : activeCourse.mockTest ? (
                            <button onClick={() => setView('mock_test')} className="bg-green-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-600">Start Mock Test</button>
                        ) : (
                            <button onClick={handleGenerateMockTest} className="bg-accent text-white font-semibold py-2 px-6 rounded-lg hover:bg-highlight">Generate Mock Test</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const DoubtClarificationView: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    moduleContext: string;
    moduleTitle: string;
    apiKey: string;
}> = ({ isOpen, onClose, moduleContext, moduleTitle, apiKey }) => {
    const [messages, setMessages] = useState<{ sender: 'user' | 'ai' | 'system', text: string }[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isClarifying, setIsClarifying] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if(isOpen) {
            setMessages([{ sender: 'system', text: "Ask me anything about this module's content." }]);
            setUserInput('');
        }
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleClarify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isClarifying) return;

        const newMessages = [...messages, { sender: 'user' as const, text: userInput }];
        setMessages(newMessages);
        setUserInput('');
        setIsClarifying(true);

        try {
            const response = await clarifyDoubt(apiKey, userInput, moduleContext);
            setMessages([...newMessages, { sender: 'ai' as const, text: response }]);
        } catch (error: any) {
            setMessages([...newMessages, { sender: 'system' as const, text: `Error: ${error.message}` }]);
        } finally {
            setIsClarifying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 flex items-center justify-center" onClick={onClose}>
            <div className="bg-secondary w-full max-w-2xl h-[70vh] rounded-2xl shadow-2xl flex flex-col border border-border-color" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-border-color">
                    <h3 className="text-lg font-bold text-text-primary text-center">AI Tutor: {moduleTitle}</h3>
                </header>
                <main className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                             {msg.sender === 'ai' && <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white flex-shrink-0 text-sm font-bold">Q</div>}
                             <div className={`max-w-md p-3 rounded-lg ${
                                msg.sender === 'user' ? 'bg-accent text-white rounded-br-none' : 
                                msg.sender === 'ai' ? 'bg-primary text-text-primary rounded-bl-none' :
                                'bg-yellow-100 text-yellow-800 text-sm text-center w-full'
                            }`}>
                                <p>{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isClarifying && (
                         <div className="flex items-end gap-2">
                             <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white flex-shrink-0 text-sm font-bold">Q</div>
                             <div className="max-w-md p-3 rounded-lg bg-primary text-text-primary rounded-bl-none">
                                <div className="flex items-center space-x-1">
                                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse"></span>
                                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse delay-100"></span>
                                    <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse delay-200"></span>
                                </div>
                            </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </main>
                <footer className="p-4 border-t border-border-color">
                    <form onSubmit={handleClarify} className="flex gap-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={e => setUserInput(e.target.value)}
                            placeholder="Ask a question..."
                            className="flex-1 w-full bg-primary p-3 rounded-lg border border-border-color focus:ring-2 focus:ring-accent focus:outline-none"
                            disabled={isClarifying}
                        />
                        <button type="submit" disabled={isClarifying} className="bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-highlight transition-all">Send</button>
                    </form>
                </footer>
            </div>
        </div>
    );
};


const ModuleView: React.FC<{
    activeModule: Module | null;
    setView: (view: 'quiz') => void;
    apiKey: string;
}> = ({ activeModule, setView, apiKey }) => {
    const [isDoubtModalOpen, setIsDoubtModalOpen] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const [ttsState, setTtsState] = useState<'idle' | 'playing' | 'paused'>('idle');
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const [currentWordIndex, setCurrentWordIndex] = useState(-1);
    const wordOffsetsRef = useRef<{start: number, end: number}[]>([]);
    
    useEffect(() => {
        const getAndSetVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) return;

            const bestVoice = 
                voices.find(v => v.lang === 'en-US' && v.name === 'Google US English') ||
                voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('male')) ||
                voices.find(v => v.lang === 'en-US') ||
                voices[0];

            setSelectedVoice(bestVoice);
        };

        getAndSetVoice();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = getAndSetVoice;
        }

        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const subModules = useMemo(() => {
        if (!activeModule?.content) return [];
        
        const parsedSubModules: { title: string; content: string }[] = [];
        const contentParts = activeModule.content.split(/\n## /); 
        
        const introContent = contentParts[0]?.trim();
        if (introContent && !introContent.startsWith('## ')) {
             const firstHeadingIndex = introContent.indexOf('\n## ');
             if (firstHeadingIndex !== -1) {
                  parsedSubModules.push({
                    title: 'Module Introduction',
                    content: introContent.substring(0, firstHeadingIndex).trim(),
                  });
             } else {
                 parsedSubModules.push({
                    title: 'Module Introduction',
                    content: introContent,
                });
             }
        }
    
        contentParts.forEach((part, index) => {
            if (index === 0 && !activeModule.content.startsWith('## ')) return;

            const contentToParse = index === 0 ? part.substring(3) : part;
            
            if (!contentToParse.trim()) return;
    
            const lines = contentToParse.split('\n');
            const title = lines[0]?.trim();
            const content = lines.slice(1).join('\n').trim();
    
            if (title && title !== '#') {
                parsedSubModules.push({ title, content });
            }
        });
    
        return parsedSubModules;

    }, [activeModule?.content]);
    
    const [activeSubModuleTitle, setActiveSubModuleTitle] = useState<string>('');

    const activeSubModule = useMemo(() => {
        return subModules.find(sub => sub.title === activeSubModuleTitle);
    }, [activeSubModuleTitle, subModules]);

    useEffect(() => {
        if (subModules.length > 0) {
            setActiveSubModuleTitle(subModules[0].title);
        }
    }, [subModules]);

    useEffect(() => {
        window.speechSynthesis.cancel();
        setTtsState('idle');
        setCurrentWordIndex(-1);
    }, [activeSubModule]);

    const parsedContent = useMemo(() => {
        if (!activeSubModule) return '';
        const rawHtml = window.marked.parse(activeSubModule.content);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawHtml;
        
        tempDiv.querySelectorAll('a').forEach(a => {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        });

        let wordIndex = 0;
        const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null);
        // FIX: Explicitly type `node` as `Node | null` to fix TypeScript error.
        let node: Node | null;
        const nodesToReplace: { oldNode: Node, newNode: DocumentFragment }[] = [];

        while((node = walker.nextNode())) {
            if (node.parentElement?.closest('pre, code, script, style')) continue;
            const text = node.textContent || '';
            if (text.trim().length === 0) continue;

            const fragment = document.createDocumentFragment();
            const words = text.split(/(\s+)/);

            words.forEach(word => {
                if (word.trim().length > 0) {
                    const span = document.createElement('span');
                    span.id = `word-${wordIndex++}`;
                    span.textContent = word;
                    fragment.appendChild(span);
                } else {
                    fragment.appendChild(document.createTextNode(word));
                }
            });
            nodesToReplace.push({ oldNode: node, newNode: fragment });
        }
        
        nodesToReplace.forEach(({ oldNode, newNode }) => {
            oldNode.parentNode?.replaceChild(newNode, oldNode);
        });

        return tempDiv.innerHTML;
    }, [activeSubModule]);

    useEffect(() => {
        if (contentRef.current && window.MathJax) {
            try {
                window.MathJax.typeset();
            } catch (error) {
                console.error("MathJax rendering error:", error);
            }
        }
    }, [parsedContent]);

    useEffect(() => {
        if (!contentRef.current) return;

        const previousHighlight = contentRef.current.querySelector('.tts-highlight');
        if (previousHighlight) {
            previousHighlight.classList.remove('tts-highlight');
        }

        if (currentWordIndex >= 0) {
            const currentWordEl = contentRef.current.querySelector<HTMLElement>(`#word-${currentWordIndex}`);
            if (currentWordEl) {
                currentWordEl.classList.add('tts-highlight');
                
                const mainScrollArea = document.querySelector('main.overflow-y-auto');
                if (mainScrollArea) {
                    const elementRect = currentWordEl.getBoundingClientRect();
                    const parentRect = mainScrollArea.getBoundingClientRect();
                    if (elementRect.top < parentRect.top || elementRect.bottom > parentRect.bottom) {
                        currentWordEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
                    }
                }
            }
        }
    }, [currentWordIndex]);

    const handlePlayPause = useCallback(() => {
        if (ttsState === 'playing') {
            window.speechSynthesis.pause();
            return;
        } 
        if (ttsState === 'paused') {
            window.speechSynthesis.resume();
            return;
        }
        if (activeSubModule && ttsState === 'idle' && contentRef.current) {
            window.speechSynthesis.cancel();
            
            const wordElements = Array.from(contentRef.current.querySelectorAll<HTMLSpanElement>('[id^="word-"]'));
            if (wordElements.length === 0) return;

            const textForSynthesis: string[] = [];
            const offsets: {start: number, end: number}[] = [];
            let charCount = 0;

            wordElements.forEach(el => {
                const word = el.textContent || '';
                textForSynthesis.push(word);
                offsets.push({ start: charCount, end: charCount + word.length });
                charCount += word.length + 1;
            });
            
            const fullText = textForSynthesis.join(' ');
            wordOffsetsRef.current = offsets;
            if (!fullText.trim()) return;

            const utterance = new SpeechSynthesisUtterance(fullText);
            utteranceRef.current = utterance;

            if (selectedVoice) utterance.voice = selectedVoice;

            utterance.onboundary = (event) => {
                const charIndex = event.charIndex;
                const wordIndex = wordOffsetsRef.current.findIndex(offset => charIndex >= offset.start && charIndex < offset.end + 1);
                if (wordIndex !== -1) setCurrentWordIndex(wordIndex);
            };

            utterance.onstart = () => setTtsState('playing');
            utterance.onpause = () => setTtsState('paused');
            utterance.onresume = () => setTtsState('playing');
            utterance.onend = () => {
                setTtsState('idle');
                setCurrentWordIndex(-1);
            };
            utterance.onerror = (e) => {
                console.error("Speech synthesis error", e);
                setTtsState('idle');
                setCurrentWordIndex(-1);
            };
            
            window.speechSynthesis.speak(utterance);
        }
    }, [ttsState, activeSubModule, selectedVoice]);
    
    const handleStop = () => {
        window.speechSynthesis.cancel();
        setTtsState('idle');
        setCurrentWordIndex(-1);
    };

    if (!activeModule || !activeModule.content) return null;

    return (
        <div className="relative">
           <h2 className="text-3xl font-bold mb-2">{activeModule.title}</h2>
           <p className="text-text-secondary mb-8">Select a topic from the outline below to begin your study session.</p>
           
           <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
               <aside className="md:w-1/3 lg:w-1/4 md:sticky top-24 self-start">
                   <div className="bg-secondary p-4 rounded-lg border border-border-color">
                       <h3 className="font-bold text-text-primary mb-4 text-lg">Module Outline</h3>
                       <nav>
                           <ul className="space-y-1">
                               {subModules.map((sub) => (
                                   <li key={sub.title}>
                                       <a
                                           href="#"
                                           onClick={(e) => {
                                               e.preventDefault();
                                               setActiveSubModuleTitle(sub.title)
                                           }}
                                           className={`block w-full text-left p-3 rounded-md text-sm transition-colors ${activeSubModuleTitle === sub.title ? 'bg-accent/10 text-accent font-semibold' : 'text-text-secondary hover:bg-primary hover:text-text-primary'}`}
                                       >
                                           {sub.title}
                                       </a>
                                   </li>
                               ))}
                           </ul>
                       </nav>
                   </div>
               </aside>

               <main className="md:w-2/3 lg:w-3/4 min-w-0">
                   {activeSubModule ? (
                        <section>
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-color">
                                <h3 className="text-2xl font-bold text-text-primary">{activeSubModule.title}</h3>
                                <div className="flex items-center space-x-2">
                                    <button onClick={handlePlayPause} className="p-2 text-text-secondary hover:text-accent transition-colors" title={ttsState === 'playing' ? 'Pause' : 'Play'}>
                                        {ttsState === 'playing' ? <PauseIcon className="w-6 h-6"/> : <PlayIcon className="w-6 h-6"/>}
                                    </button>
                                    <button onClick={handleStop} disabled={ttsState === 'idle'} className="p-2 text-text-secondary hover:text-red-500 transition-colors disabled:opacity-50" title="Stop">
                                        <StopIcon className="w-6 h-6"/>
                                    </button>
                                </div>
                            </div>
                            <div
                                ref={contentRef}
                                className="prose prose-lg max-w-none prose-headings:text-text-primary prose-p:text-text-primary prose-a:text-accent prose-blockquote:text-text-secondary prose-strong:text-text-primary prose-li:text-text-primary"
                                dangerouslySetInnerHTML={{ __html: parsedContent }}
                            ></div>
                        </section>
                   ) : (
                       <div className="p-4">Select a topic from the outline to get started.</div>
                   )}
               </main>
           </div>
           
           <div className="mt-12 pt-8 border-t border-border-color">
                <button onClick={() => setView('quiz')} className="w-full bg-accent text-white font-bold py-3 px-4 rounded-lg hover:bg-highlight transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl">
                    I'm Ready! Start Quiz to Unlock Next Module
                </button>
           </div>
            
            <button
                onClick={() => setIsDoubtModalOpen(true)}
                className="fixed bottom-8 right-8 bg-accent text-white p-4 rounded-full shadow-2xl hover:bg-highlight transition-transform hover:scale-110 z-30 flex items-center gap-2"
                aria-label="Ask a question"
            >
                <QuestionMarkCircleIcon className="w-8 h-8" />
            </button>
            <DoubtClarificationView
                isOpen={isDoubtModalOpen}
                onClose={() => setIsDoubtModalOpen(false)}
                moduleContext={activeModule.content}
                moduleTitle={activeModule.title}
                apiKey={apiKey}
            />
        </div>
    );
};


const QuizView: React.FC<{
    quiz: Quiz;
    handleQuizSubmit: (answers: Record<number, string[]>) => void;
    isMockTest?: boolean;
}> = ({ quiz, handleQuizSubmit, isMockTest = false }) => {
    const [answers, setAnswers] = useState<Record<number, string[]>>({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const questionContainerRef = useRef<HTMLDivElement>(null);

    const handleAnswerChange = (qIndex: number, answer: string, type: QuizType) => {
        setAnswers(prev => {
            const newAnswers = { ...prev };
            if (type === QuizType.MSQ) {
                const currentAnswers = newAnswers[qIndex] || [];
                if (currentAnswers.includes(answer)) {
                    newAnswers[qIndex] = currentAnswers.filter(a => a !== answer);
                } else {
                    newAnswers[qIndex] = [...currentAnswers, answer];
                }
            } else {
                newAnswers[qIndex] = [answer];
            }
            return newAnswers;
        });
    };

    const q = quiz.questions[currentQuestionIndex];

    useEffect(() => {
        if (questionContainerRef.current && window.MathJax) {
            try {
                window.MathJax.typeset();
            } catch (error) {
                console.error("MathJax rendering error in QuizView:", error);
            }
        }
    }, [currentQuestionIndex, q]);

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-2 text-center">{quiz.title}</h2>
            <p className="text-text-secondary text-center mb-6">{isMockTest ? "Final Assessment" : `Module Quiz`}</p>

            {/* Progress Bar */}
            <div className="w-full bg-primary rounded-full h-2.5 mb-8">
                <div className="bg-accent h-2.5 rounded-full" style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}></div>
            </div>
            <p className="text-center text-text-secondary font-semibold mb-4">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>

            <div ref={questionContainerRef} className="bg-secondary p-8 rounded-lg border border-border-color min-h-[300px]">
                <p className="font-semibold text-lg mb-6">{q.question}</p>
                <div className="space-y-3">
                    {q.options?.map((option, oIndex) => (
                        <label key={oIndex} className="flex items-center p-4 rounded-lg hover:bg-primary cursor-pointer border border-transparent has-[:checked]:bg-accent/10 has-[:checked]:border-accent transition-all">
                            <input
                                type={q.type === QuizType.MSQ ? 'checkbox' : 'radio'}
                                name={`q-${currentQuestionIndex}`}
                                checked={answers[currentQuestionIndex]?.includes(option)}
                                onChange={() => handleAnswerChange(currentQuestionIndex, option, q.type)}
                                className="h-5 w-5 text-accent border-gray-300 focus:ring-accent"
                            />
                            <span className="ml-4 text-text-primary">{option}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8">
                <button
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    disabled={currentQuestionIndex === 0}
                    className="bg-secondary text-text-primary font-bold py-2 px-6 rounded-lg hover:bg-primary border border-border-color transition-all disabled:opacity-50"
                >
                    Previous
                </button>
                {currentQuestionIndex === quiz.questions.length - 1 ? (
                    <button onClick={() => handleQuizSubmit(answers)} className="bg-accent text-white font-bold py-3 px-8 rounded-lg hover:bg-highlight transition-all">
                        Submit Answers
                    </button>
                ) : (
                    <button
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                        className="bg-accent text-white font-bold py-2 px-6 rounded-lg hover:bg-highlight transition-all"
                    >
                        Next
                    </button>
                )}
            </div>
        </div>
    );
};

const QuizResultsView: React.FC<{
    score: number;
    totalQuestions: number;
    attempts: number;
    setView: (view: 'course' | 'path' | 'quiz_answers') => void;
    onShowAnswers: () => void;
    isPath: boolean;
}> = ({ score, totalQuestions, attempts, setView, onShowAnswers, isPath }) => {
    const percentage = Math.round((score / totalQuestions) * 100);
    const passed = percentage >= 80;

    return (
        <div className="text-center bg-secondary p-8 rounded-xl shadow-lg border border-border-color">
            <h2 className="text-3xl font-bold mb-4">Quiz Results</h2>
            <div className={`text-6xl font-bold mb-4 ${passed ? 'text-green-500' : 'text-red-500'}`}>
                {percentage}%
            </div>
            <p className="text-text-secondary mb-6">You answered {score} out of {totalQuestions} questions correctly.</p>
            {passed ? (
                <div>
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4"/>
                    <h3 className="text-2xl font-semibold text-green-600 mb-2">Congratulations!</h3>
                    <p className="text-text-secondary">You've passed this module and unlocked the next one.</p>
                </div>
            ) : (
                 <div>
                    <AwardIcon className="w-16 h-16 text-red-500 mx-auto mb-4"/>
                    <h3 className="text-2xl font-semibold text-red-600 mb-2">Keep Trying!</h3>
                    <p className="text-text-secondary">You need a score of 80% or higher to unlock the next module. Please review the material and try again.</p>
                </div>
            )}
            
            {!passed && attempts >= 3 && (
                 <div className="mt-6 p-4 bg-primary rounded-lg border border-border-color">
                    <p className="text-text-secondary mb-2">You've attempted this quiz {attempts} times.</p>
                    <button onClick={onShowAnswers} className="text-accent underline font-semibold hover:text-highlight">
                        Need help? Show Correct Answers
                    </button>
                </div>
            )}

            <button onClick={() => setView(isPath ? 'path' : 'course')} className="mt-8 bg-accent text-white font-bold py-3 px-6 rounded-lg hover:bg-highlight transition-all">
                Back to {isPath ? 'Learning Path' : 'Course'}
            </button>
        </div>
    )
};

const QuizAnswersView: React.FC<{
    quiz: Quiz;
    setView: (view: 'course' | 'path') => void;
    isPath: boolean;
}> = ({ quiz, setView, isPath }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current && window.MathJax) {
            try {
                window.MathJax.typeset();
            } catch (error) {
                console.error("MathJax rendering error in QuizAnswersView:", error);
            }
        }
    }, [quiz]);

    return (
        <div className="max-w-4xl mx-auto" ref={contentRef}>
            <h2 className="text-3xl font-bold mb-2 text-center">{quiz.title} - Correct Answers</h2>
            <p className="text-text-secondary text-center mb-8">Review the correct answers below to improve your understanding.</p>

            <div className="space-y-6">
                {quiz.questions.map((q, qIndex) => (
                    <div key={qIndex} className="bg-secondary p-6 rounded-lg border border-border-color">
                        <p className="font-semibold text-lg mb-4">({qIndex + 1}) {q.question}</p>
                        <div className="space-y-3">
                            {q.options?.map((option, oIndex) => {
                                const isCorrect = q.correctAnswers.includes(option);
                                return (
                                    <div key={oIndex} className={`flex items-start p-3 rounded-lg border ${isCorrect ? 'bg-green-500/10 border-green-500/30' : 'bg-primary border-transparent'}`}>
                                        <span className={`mr-3 font-bold ${isCorrect ? 'text-green-600' : 'text-text-secondary'}`}>{isCorrect ? '✔' : '•'}</span>
                                        <span className={`${isCorrect ? 'text-green-700 font-semibold' : 'text-text-primary'}`}>{option}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
             <div className="text-center mt-8">
                <button onClick={() => setView(isPath ? 'path' : 'course')} className="bg-accent text-white font-bold py-3 px-6 rounded-lg hover:bg-highlight transition-all">
                    Back to {isPath ? 'Learning Path' : 'Course'}
                </button>
            </div>
        </div>
    );
};

const MockTestResultsView: React.FC<{
    score: number;
    totalQuestions: number;
    badge: Badge | undefined;
    setView: (view: 'course' | 'path') => void;
    isPath: boolean;
}> = ({ score, totalQuestions, badge, setView, isPath }) => {
    const percentage = Math.round((score / totalQuestions) * 100);
    const passed = percentage >= 70;

    const getBadgeStyling = (score: number) => {
        if (score >= 90) return { name: 'Gold', color: 'text-yellow-500' };
        if (score >= 85) return { name: 'Silver', color: 'text-gray-500' };
        return { name: 'Bronze', color: 'text-orange-600' };
    };

    return (
        <div className="text-center bg-secondary p-8 rounded-xl shadow-lg border border-border-color">
            <h2 className="text-3xl font-bold mb-4">Mock Test Results</h2>
            <div className={`text-6xl font-bold mb-4 ${passed ? 'text-green-500' : 'text-red-500'}`}>
                {percentage}%
            </div>
            <p className="text-text-secondary mb-6">You answered {score} out of {totalQuestions} questions correctly.</p>
            {passed ? (
                <div>
                    <AwardIcon className="w-16 h-16 text-green-500 mx-auto mb-4"/>
                    <h3 className="text-2xl font-semibold text-green-600 mb-2">Congratulations! You Passed!</h3>
                    {badge && (
                        <p className={`text-lg font-semibold ${getBadgeStyling(badge.score).color}`}>You've earned the {getBadgeStyling(badge.score).name} Badge!</p>
                    )}
                </div>
            ) : (
                 <div>
                    <BookOpenIcon className="w-16 h-16 text-red-500 mx-auto mb-4"/>
                    <h3 className="text-2xl font-semibold text-red-600 mb-2">Almost There!</h3>
                    <p className="text-text-secondary">You need a score of 70% or higher to pass the course. Please review the material and try the mock test again.</p>
                </div>
            )}
            <button onClick={() => setView(isPath ? 'path' : 'course')} className="mt-8 bg-accent text-white font-bold py-3 px-6 rounded-lg hover:bg-highlight transition-all">
                Back to {isPath ? 'Learning Path' : 'Course'}
            </button>
        </div>
    )
};

const ProfileView: React.FC<{ 
    user: User; 
    courses: Course[];
    updateUser: (updatedUserData: Partial<User>) => void;
}> = ({ user, courses, updateUser }) => {
    const [name, setName] = useState(user.name || '');
    const [age, setAge] = useState(user.age || '');
    const [bio, setBio] = useState(user.bio || '');
    const [apiKey, setApiKey] = useState(user.apiKey || '');
    const [isSaved, setIsSaved] = useState(false);
    
    const handleSave = () => {
        updateUser({ 
            name,
            age: age ? Number(age) : undefined,
            bio,
            apiKey
        });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const coursesWithBadges = courses.filter(c => c.badge);

    const getBadgeStyling = (score: number) => {
        if (score >= 90) return { name: 'Gold', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
        if (score >= 85) return { name: 'Silver', color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/30' };
        return { name: 'Bronze', color: 'text-orange-600', bg: 'bg-orange-600/10', border: 'border-orange-600/30' };
    };

    return (
        <div>
            <div className="bg-secondary p-8 rounded-xl shadow-md border border-border-color mb-8">
                <div className="flex items-center space-x-6 mb-6">
                    <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center text-white font-bold text-4xl flex-shrink-0">
                        {name ? name[0].toUpperCase() : user.email[0].toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-text-primary">{name || 'User'}</h3>
                        <p className="text-text-secondary">{user.email}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-text-secondary mb-2 font-medium">Full Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-primary p-3 rounded-lg border border-border-color focus:ring-2 focus:ring-accent focus:outline-none"/>
                    </div>
                    <div>
                        <label className="block text-text-secondary mb-2 font-medium">Age</label>
                        <input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full bg-primary p-3 rounded-lg border border-border-color focus:ring-2 focus:ring-accent focus:outline-none"/>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-text-secondary mb-2 font-medium">Bio / Learning Goals</label>
                        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell us about yourself..." className="w-full bg-primary p-3 rounded-lg border border-border-color focus:ring-2 focus:ring-accent focus:outline-none"/>
                    </div>
                    <div className="md:col-span-2 pt-4 border-t border-border-color">
                        <label className="block text-text-secondary mb-2 font-medium flex items-center"><KeyIcon className="w-5 h-5 mr-2"/> Gemini API Key</label>
                        <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full bg-primary p-3 rounded-lg border border-border-color focus:ring-2 focus:ring-accent focus:outline-none"/>
                         <p className="text-xs text-text-secondary mt-2">
                            Your key is stored securely in your browser. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent underline hover:text-highlight">Get a key from Google AI Studio</a>.
                        </p>
                    </div>
                </div>
                 <div className="mt-6 flex justify-end items-center">
                    {isSaved && <p className="text-green-600 mr-4 transition-opacity duration-300">Saved!</p>}
                    <button onClick={handleSave} className="bg-accent text-white font-bold py-2 px-6 rounded-lg hover:bg-highlight transition-all">
                        Save Changes
                    </button>
                </div>
            </div>

            <h3 className="text-2xl font-bold text-text-primary mb-4">My Skill Badges</h3>
            {coursesWithBadges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {coursesWithBadges.map(course => {
                        const badgeStyle = getBadgeStyling(course.badge!.score);
                        return (
                            <div key={course.id} className={`p-6 rounded-xl shadow-md border ${badgeStyle.bg} ${badgeStyle.border}`}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-bold text-text-primary text-lg">{course.title}</h4>
                                        <p className="text-sm text-text-secondary">Completed on {course.badge!.dateAwarded}</p>
                                    </div>
                                    <div className={`flex items-center font-bold text-lg ${badgeStyle.color}`}>
                                        <AwardIcon className="w-6 h-6 mr-2"/>
                                        <span>{badgeStyle.name}</span>
                                    </div>
                                </div>
                                <div className="mt-4 text-center bg-secondary/50 p-3 rounded-lg">
                                    <p className="text-sm font-medium text-text-secondary">Final Score</p>
                                    <p className={`text-3xl font-bold ${badgeStyle.color}`}>{course.badge!.score}%</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                 <div className="text-center py-12 bg-secondary rounded-xl border border-border-color">
                    <AwardIcon className="w-16 h-16 text-accent/50 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-text-primary">No Badges Yet!</h3>
                    <p className="text-text-secondary mt-2">Complete a course and pass the final Mock Test to earn your first badge.</p>
                </div>
            )}
        </div>
    );
};

export const MainApp: React.FC<MainAppProps> = ({ user, logout, updateUser }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);

    const [activePath, setActivePath] = useState<LearningPath | null>(null);
    const [activeCourse, setActiveCourse] = useState<Course | null>(null);
    const [activeModule, setActiveModule] = useState<{ module: Module, index: number } | null>(null);
    const [view, setView] = useState<'dashboard' | 'create-hub' | 'create-topic' | 'create-document' | 'create-path' | 'path' | 'course' | 'module' | 'quiz' | 'quiz_results' | 'quiz_answers' | 'loading' | 'profile' | 'mock_test' | 'mock_test_results'>('dashboard');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quizScore, setQuizScore] = useState<{ score: number, total: number }>({ score: 0, total: 0 });
    const [mockTestScore, setMockTestScore] = useState<{ score: number, total: number }>({ score: 0, total: 0 });
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const COURSES_STORAGE_KEY = `quanta_courses_${user.id}`;
    const PATHS_STORAGE_KEY = `quanta_paths_${user.id}`;

    useEffect(() => {
        try {
            const storedCourses = localStorage.getItem(COURSES_STORAGE_KEY);
            if (storedCourses) setCourses(JSON.parse(storedCourses));

            const storedPaths = localStorage.getItem(PATHS_STORAGE_KEY);
            if (storedPaths) setLearningPaths(JSON.parse(storedPaths));
        } catch (error) {
            console.error("Failed to parse data from localStorage", error);
        }
    }, [user.id]);

    useEffect(() => {
        localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(courses));
    }, [courses]);

     useEffect(() => {
        localStorage.setItem(PATHS_STORAGE_KEY, JSON.stringify(learningPaths));
    }, [learningPaths]);

    const handleCreateCourse = async (topic: string, level: string, fileContent?: {mimeType: string, data: string}) => {
        if (!user.apiKey) {
            setError("Please set your Gemini API key in your profile before creating a course.");
            setView('profile');
            return;
        }
        setLoading(true);
        setError(null);
        setView('loading');
        try {
            const outline = await generateCourseOutline(user.apiKey, topic, level, fileContent);
            const newCourse: Course = {
                id: new Date().toISOString(),
                ...outline,
                isCompleted: false,
                modules: outline.modules.map((m: any) => ({ ...m, isCompleted: false, generationState: GenerationState.LOCKED, quizAttempts: 0 })),
                unlockedModuleIndex: 0
            };
            
            setCourses(prev => [...prev, newCourse]);
            setActiveCourse(newCourse);
            setView('course');
        } catch (e: any) {
            setError(e.message);
            setView('create-topic');
        } finally {
            setLoading(false);
        }
    };
    
    const handleCreateLearningPath = async (goal: string, level: string) => {
        if (!user.apiKey) {
            setError("Please set your Gemini API key in your profile before creating a path.");
            setView('profile');
            return;
        }
        setLoading(true);
        setError(null);
        setView('loading');
        try {
            const pathOutline = await generateLearningPathOutline(user.apiKey, goal, level);
            const newPath: LearningPath = {
                id: new Date().toISOString(),
                title: pathOutline.title,
                description: pathOutline.description,
                unlockedCourseIndex: 0,
                courses: pathOutline.courses.map((c: any) => ({
                    id: new Date().toISOString() + c.title,
                    title: c.title,
                    description: c.description,
                    isCompleted: false,
                    unlockedModuleIndex: 0,
                    modules: c.modules.map((m: any) => ({
                        ...m,
                        isCompleted: false,
                        generationState: GenerationState.LOCKED,
                        quizAttempts: 0
                    }))
                }))
            };
            
            setLearningPaths(prev => [...prev, newPath]);
            setActivePath(newPath);
            setView('path');

        } catch (e: any) {
            setError(e.message);
            setView('create-path');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateModule = useCallback(async (moduleIndex: number) => {
        if (!activeCourse || !user.apiKey) return;
        
        const updateModuleState = (state: GenerationState, content?: string, quiz?: Quiz) => {
            const courseUpdater = (c: Course) => {
                 if (c.id === activeCourse.id) {
                    const updatedModules = [...c.modules];
                    updatedModules[moduleIndex] = { ...updatedModules[moduleIndex], generationState: state, content, quiz };
                    const updatedCourse = { ...c, modules: updatedModules };
                    setActiveCourse(updatedCourse); // update active course state
                    return updatedCourse;
                }
                return c;
            };

            setCourses(prev => prev.map(courseUpdater));
            setLearningPaths(prev => prev.map(path => ({
                ...path,
                courses: path.courses.map(courseUpdater)
            })));
        };

        updateModuleState(GenerationState.GENERATING);

        try {
            const { content, quiz } = await generateModuleContentAndQuiz(user.apiKey, activeCourse.title, activeCourse.modules[moduleIndex].title);
            updateModuleState(GenerationState.READY, content, quiz);
        } catch (e) {
            console.error("Failed to generate module:", e);
            updateModuleState(GenerationState.FAILED);
        }
    }, [activeCourse, user.apiKey]);

    const handleQuizSubmit = (answers: Record<number, string[]>) => {
        if (!activeModule || !activeModule.module.quiz || !activeCourse) return;
        
        let score = 0;
        const quiz = activeModule.module.quiz;
        quiz.questions.forEach((q, index) => {
            const userAnswers = answers[index]?.sort() || [];
            const correctAnswers = q.correctAnswers.sort();
            if (JSON.stringify(userAnswers) === JSON.stringify(correctAnswers)) {
                score++;
            }
        });
        
        const percentage = Math.round((score / quiz.questions.length) * 100);
        setQuizScore({ score, total: quiz.questions.length });

        const courseUpdater = (c: Course) => {
            if (c.id !== activeCourse.id) return c;
            
            let updatedModules;
            if (percentage >= 80) {
                 updatedModules = c.modules.map((m, i) => i === activeModule.index ? { ...m, isCompleted: true, quizScore: percentage, quizAttempts: 0 } : m);
            } else {
                 updatedModules = c.modules.map((m, i) => i === activeModule.index ? { ...m, quizAttempts: (m.quizAttempts || 0) + 1 } : m);
            }

            let newUnlockedIndex = c.unlockedModuleIndex;
            if (percentage >= 80 && c.unlockedModuleIndex === activeModule.index) {
                newUnlockedIndex = c.unlockedModuleIndex + 1;
            }

            let updatedCourse = { ...c, modules: updatedModules, unlockedModuleIndex: newUnlockedIndex };
            
            const isCourseComplete = updatedModules.every(m => m.isCompleted);
            if (isCourseComplete) {
                updatedCourse.isCompleted = true;
            }
            setActiveCourse(updatedCourse);
            return updatedCourse;
        };

        setCourses(prev => prev.map(courseUpdater));
        
        if (activePath) {
            setLearningPaths(prevPaths => prevPaths.map(p => {
                if (p.id !== activePath.id) return p;
                
                const updatedPathCourses = p.courses.map(courseUpdater);
                const currentCourseIndex = updatedPathCourses.findIndex(c => c.id === activeCourse.id);
                let newUnlockedCourseIndex = p.unlockedCourseIndex;

                if (currentCourseIndex !== -1 && updatedPathCourses[currentCourseIndex].isCompleted && currentCourseIndex === p.unlockedCourseIndex) {
                    newUnlockedCourseIndex++;
                }
                
                const updatedPath = { ...p, courses: updatedPathCourses, unlockedCourseIndex: newUnlockedCourseIndex };
                setActivePath(updatedPath);
                return updatedPath;
            }));
        }
        
        setView('quiz_results');
    };

    const handleGenerateMockTest = useCallback(async () => {
        if (!activeCourse || !user.apiKey) return;

        const courseUpdater = (c: Course) => {
            if (c.id === activeCourse.id) {
                const updatedCourse = { ...c, mockTestState: GenerationState.GENERATING };
                setActiveCourse(updatedCourse);
                return updatedCourse;
            }
            return c;
        };
        setCourses(prev => prev.map(courseUpdater));
        setLearningPaths(prev => prev.map(path => ({ ...path, courses: path.courses.map(courseUpdater) })));

        try {
            const mockTestQuiz = await generateMockTest(user.apiKey, activeCourse.title, activeCourse.modules);
            
            const courseUpdaterWithTest = (c: Course) => {
                if (c.id === activeCourse.id) {
                    const updatedCourse = { ...c, mockTest: mockTestQuiz, mockTestState: GenerationState.READY };
                    setActiveCourse(updatedCourse);
                    return updatedCourse;
                }
                return c;
            };
            setCourses(prev => prev.map(courseUpdaterWithTest));
            setLearningPaths(prev => prev.map(path => ({ ...path, courses: path.courses.map(courseUpdaterWithTest) })));

        } catch(e) {
            const courseUpdaterFail = (c: Course) => {
                if (c.id === activeCourse.id) {
                    const updatedCourse = { ...c, mockTestState: GenerationState.FAILED };
                    setActiveCourse(updatedCourse);
                    return updatedCourse;
                }
                return c;
            };
            setCourses(prev => prev.map(courseUpdaterFail));
            setLearningPaths(prev => prev.map(path => ({ ...path, courses: path.courses.map(courseUpdaterFail) })));
        }
    }, [activeCourse, user.apiKey]);

    const handleMockTestSubmit = (answers: Record<number, string[]>) => {
        if (!activeCourse?.mockTest) return;

        let score = 0;
        const quiz = activeCourse.mockTest;
        quiz.questions.forEach((q, index) => {
            const userAnswers = answers[index]?.sort() || [];
            const correctAnswers = q.correctAnswers.sort();
            if (JSON.stringify(userAnswers) === JSON.stringify(correctAnswers)) {
                score++;
            }
        });

        const percentage = Math.round((score / quiz.questions.length) * 100);
        setMockTestScore({ score, total: quiz.questions.length });

        let newBadge: Badge | undefined = undefined;
        if (percentage >= 70) { 
            if (percentage >= 80) {
                newBadge = {
                    courseTitle: activeCourse.title,
                    score: percentage,
                    dateAwarded: new Date().toLocaleDateString(),
                };
            }
        }

        const courseUpdater = (c: Course) => {
            if (c.id === activeCourse.id) {
                const updatedCourse = { ...c, mockTestScore: percentage, ...(newBadge && { badge: newBadge }) };
                setActiveCourse(updatedCourse);
                return updatedCourse;
            }
            return c;
        };
        setCourses(prev => prev.map(courseUpdater));
        setLearningPaths(prev => prev.map(path => ({ ...path, courses: path.courses.map(courseUpdater) })));

        setView('mock_test_results');
    };


    const setViewAndActiveModule = (module: Module, index: number) => {
        setActiveModule({ module, index });
        setView('module');
    };
    
    const setAppView = (
        newView: 'dashboard' | 'create-hub' | 'create-topic' | 'create-document' | 'create-path' | 'path' | 'course' | 'module' | 'quiz' | 'quiz_results' | 'quiz_answers' | 'loading' | 'profile' | 'mock_test' | 'mock_test_results'
    ) => {
        if (!['course', 'module', 'quiz', 'quiz_results', 'quiz_answers', 'mock_test', 'mock_test_results'].includes(newView)) {
            setActiveCourse(null);
            setActiveModule(null);
        }
         if (newView !== 'path') {
            setActivePath(null);
        }
        if(newView === 'dashboard') {
             setActivePath(null);
        }

        setView(newView);
    }
    
    if (!user.apiKey) {
        return <ApiKeySetup updateUser={updateUser} />;
    }

    const renderContent = () => {
        if (loading || view === 'loading') return <div className="flex items-center justify-center h-full"><WorldLoader /></div>;
        if (error) return <div className="text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>;

        switch (view) {
            case 'dashboard':
                return <Dashboard courses={courses} learningPaths={learningPaths} setView={(v) => setAppView(v as any)} setActiveCourse={setActiveCourse} setActivePath={setActivePath} />;
            case 'profile':
                return <ProfileView user={user} courses={[...courses, ...learningPaths.flatMap(p => p.courses)]} updateUser={updateUser} />;
            case 'create-hub':
                 return <CreationHub setView={(v) => setAppView(v as any)} />;
            case 'create-topic':
                return <TopicCreator handleCreateCourse={handleCreateCourse} setView={(v) => setAppView(v as any)} loading={loading} setError={setError} />;
            case 'create-path':
                return <PathCreator handleCreatePath={handleCreateLearningPath} setView={(v) => setAppView(v as any)} loading={loading} setError={setError} />;
            case 'create-document':
                return <DocumentCreator handleCreateCourse={handleCreateCourse} setView={(v) => setAppView(v as any)} loading={loading} setError={setError} />;
            case 'path':
                if (activePath) return <PathView activePath={activePath} setView={(v) => setAppView(v as any)} setActiveCourse={setActiveCourse} />;
                break;
            case 'course':
                if (activeCourse) return <CourseView activeCourse={activeCourse} setView={(v) => setAppView(v as any)} setActiveModule={setViewAndActiveModule} handleGenerateModule={handleGenerateModule} handleGenerateMockTest={handleGenerateMockTest} />;
                break;
            case 'module':
                if (activeModule) return <ModuleView activeModule={activeModule.module} apiKey={user.apiKey!} setView={(v) => setAppView(v as any)} />;
                break;
            case 'quiz':
                if (activeModule?.module.quiz) return <QuizView quiz={activeModule.module.quiz} handleQuizSubmit={handleQuizSubmit} />;
                break;
            case 'quiz_results':
                return <QuizResultsView score={quizScore.score} totalQuestions={quizScore.total} setView={(v) => setAppView(v as any)} isPath={!!activePath} attempts={activeModule?.module.quizAttempts || 0} onShowAnswers={() => setView('quiz_answers')} />;
            case 'quiz_answers':
                 if (activeModule?.module.quiz) return <QuizAnswersView quiz={activeModule.module.quiz} setView={(v) => setAppView(v as any)} isPath={!!activePath} />;
                 break;
            case 'mock_test':
                if (activeCourse?.mockTest) return <QuizView quiz={activeCourse.mockTest} handleQuizSubmit={handleMockTestSubmit} isMockTest={true} />;
                break;
            case 'mock_test_results':
                return <MockTestResultsView score={mockTestScore.score} totalQuestions={mockTestScore.total} badge={activeCourse?.badge} setView={(v) => setAppView(v as any)} isPath={!!activePath} />;
        }
        // Default to dashboard
        return <Dashboard courses={courses} learningPaths={learningPaths} setView={(v) => setAppView(v as any)} setActiveCourse={setActiveCourse} setActivePath={setActivePath} />;
    };

    return (
        <div className="h-screen bg-primary flex">
            <Sidebar 
                isOpen={isSidebarOpen}
                courses={courses}
                learningPaths={learningPaths}
                activeItemId={activeCourse?.id || activePath?.id || null}
                setView={(v) => setAppView(v as any)}
                setActiveCourse={setActiveCourse}
                setActivePath={setActivePath}
            />
             <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-72' : 'md:ml-0'}`}>
                <Header 
                    toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    user={user}
                    logout={logout}
                    setView={(v) => setAppView(v as any)}
                />
                <main className="flex-1 p-8 overflow-y-auto">
                    <Breadcrumbs 
                        view={view}
                        activePath={activePath}
                        activeCourse={activeCourse}
                        activeModule={activeModule}
                        setView={(v) => setAppView(v as any)}
                        setActiveCourse={setActiveCourse}
                        setActivePath={setActivePath}
                    />
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};
