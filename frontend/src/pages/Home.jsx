import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCallback, useState, useEffect } from "react";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

const TYPEWRITER_TEXTS = [
    "Quality Education",
    "Clean Energy",
    "Climate Action",
    "Zero Hunger",
    "Gender Equality"
];

export default function Home() {
    const [textIndex, setTextIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTextIndex((prev) => (prev + 1) % TYPEWRITER_TEXTS.length);
        }, 3500);
        return () => clearInterval(interval);
    }, []);

    const particlesInit = useCallback(async engine => {
        await loadFull(engine);
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.15 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
    };

    const floatingBadgeVariants = {
        animate: {
            y: [0, -15, 0],
            rotate: [0, 2, -2, 0],
            transition: {
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
            }
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
            {/* Subtle Interactive Particle Overlay */}
            <Particles
                id="tsparticles"
                init={particlesInit}
                options={{
                    fullScreen: { enable: false, zIndex: 0 },
                    background: { color: { value: "transparent" } },
                    fpsLimit: 60,
                    interactivity: {
                        events: { onHover: { enable: true, mode: "repulse" }, resize: true },
                        modes: { repulse: { distance: 100, duration: 0.4 } },
                    },
                    particles: {
                        color: { value: ["#e5243b", "#dda63a", "#4c9f38", "#c5192d", "#ff3a21"] },
                        links: { color: "#ffffff", distance: 150, enable: true, opacity: 0.1, width: 1 },
                        collisions: { enable: false },
                        move: { direction: "none", enable: true, outModes: { default: "bounce" }, random: false, speed: 0.8, straight: false },
                        number: { density: { enable: true, area: 800 }, value: 40 },
                        opacity: { value: 0.4 },
                        shape: { type: "circle" },
                        size: { value: { min: 2, max: 5 } },
                    },
                    detectRetina: true,
                }}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 0
                }}
            />

            <div className="container" style={{ position: 'relative', zIndex: 1 }}>

                {/* Floating "Liquid Glass" Badges */}
                <motion.div
                    variants={floatingBadgeVariants}
                    animate="animate"
                    style={{
                        position: 'absolute', top: '10%', left: '-5%',
                        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)',
                        padding: '10px 20px', borderRadius: '30px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        border: '1px solid rgba(255,255,255,0.4)', color: 'var(--text-color)', fontWeight: 'bold'
                    }}
                >
                    17 UN SDG goals
                </motion.div>

                <motion.div
                    variants={floatingBadgeVariants}
                    animate="animate"
                    style={{
                        position: 'absolute', top: '25%', right: '-2%',
                        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(12px)',
                        padding: '10px 20px', borderRadius: '30px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 'bold',
                        animationDelay: '1s'
                    }}
                >
                    Intelligent SDG alignment
                </motion.div>


                <motion.div
                    className="text-center"
                    style={{ padding: '6rem 0 4rem 0' }}
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                >
                    <motion.h1
                        variants={itemVariants}
                        style={{ fontSize: '4.5rem', marginBottom: '1.5rem', fontWeight: '800', lineHeight: '1.1' }}
                    >
                        <span style={{ color: 'var(--text-color)' }}>Build projects for</span>
                        <br />
                        <motion.span
                            key={textIndex}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            style={{
                                display: 'inline-block',
                                background: 'linear-gradient(135deg, var(--primary) 0%, #818cf8 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                marginTop: '0.5rem'
                            }}
                        >
                            {TYPEWRITER_TEXTS[textIndex]}
                        </motion.span>
                    </motion.h1>

                    <motion.p
                        variants={itemVariants}
                        className="text-muted"
                        style={{ fontSize: '1.25rem', maxWidth: '750px', margin: '0 auto 3rem', lineHeight: '1.6' }}
                    >
                        An intelligent, collaborative project management ecosystem actively aligning your research and technical builds directly with the United Nations Sustainable Development Goals.
                    </motion.p>

                    <motion.div variants={itemVariants} className="flex-center gap-4">
                        <Link to="/login" className="btn btn-primary" style={{ padding: '1.1rem 2.5rem', fontSize: '1.1rem', borderRadius: '30px', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.4)' }}>
                            Login to Dashboard
                        </Link>
                        <Link to="/register" className="btn btn-secondary" style={{ padding: '1.1rem 2.5rem', fontSize: '1.1rem', borderRadius: '30px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                            Create Account
                        </Link>
                    </motion.div>
                </motion.div>

                <motion.div
                    className="grid grid-cols-1 grid-cols-3"
                    style={{ marginTop: '2rem', paddingBottom: '6rem' }}
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-50px" }}
                >
                    {[
                        { title: "SDG Alignment", desc: "Automatically analyze and align your projects with relevant UN Sustainable Development Goals using advanced AI." },
                        { title: "Collaboration", desc: "Connect faculty and students to work on meaningful social good projects efficiently within unified workspaces." },
                        { title: "Impact Tracking", desc: "Monitor the progress and real-world impact of your projects with an intelligent, data-driven dashboard." }
                    ].map((feature, idx) => (
                        <motion.div
                            key={idx}
                            variants={itemVariants}
                            whileHover={{
                                y: -10,
                                rotateX: 5,
                                rotateY: 5,
                                scale: 1.02,
                                boxShadow: "0 20px 40px rgba(0,0,0,0.15)"
                            }}
                            className="card text-center home-feature-card"
                        >
                            <h3 style={{ transform: 'translateZ(10px)', marginTop: '0.5rem' }}>{feature.title}</h3>
                            <p className="text-muted" style={{ transform: 'translateZ(5px)' }}>{feature.desc}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}
