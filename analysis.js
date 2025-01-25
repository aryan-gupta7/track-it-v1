class ActivityAnalytics {
    constructor(jsonData) {
        this.rawData = jsonData;
        this.processedData = this.preprocessData();
        console.log("Processed Data:", this.processedData); // Debug log
    }

    preprocessData() {
        return Object.entries(this.rawData).map(([app, data]) => ({
            appName: app,
            totalTime: data.total_time,
            sessionsCount: data.total_sessions,
            avgSessionLength: data.total_time / data.total_sessions,
            cpuUsage: data.avg_cpu_usage,
            memoryUsage: data.avg_memory_usage,
            path: data.last_path,
            sessions: data.sessions.map(s => ({
                ...s,
                start: moment(s.start_time),
                end: moment(s.end_time)
            }))
        }));
    }


    createAppUsageDonut() {
        console.log("Creating donut chart");
        const ctx = document.getElementById('appUsage').getContext('2d');
        
        // Predefined set of visually distinct colors
        const colors = [
            '#FF6384', // Red
            '#36A2EB', // Blue
            '#FFCE56', // Yellow
            '#4BC0C0', // Turquoise
            '#9966FF', // Purple
            '#FF9F40', // Orange
            '#45B7D1', // Sky Blue
            '#96C93D', // Green
            '#E67E22', // Dark Orange
            '#E74C3C', // Bright Red
            '#8E44AD', // Dark Purple
            '#2ECC71', // Emerald
            '#3498DB', // Ocean Blue
            '#F1C40F', // Sun Yellow
            '#1ABC9C', // Turquoise
            '#D35400', // Pumpkin
            '#C0392B', // Dark Red
            '#16A085', // Green Sea
            '#2980B9', // Belize Hole
            '#8E44AD'  // Wisteria
        ];

        // Sort apps by usage time (descending)
        const sortedData = [...this.processedData]
            .sort((a, b) => b.totalTime - a.totalTime);

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: sortedData.map(d => d.appName.replace('.exe', '')),
                datasets: [{
                    data: sortedData.map(d => d.totalTime),
                    backgroundColor: colors,
                    borderWidth: 1,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            generateLabels: (chart) => {
                                const data = chart.data;
                                return data.labels.map((label, i) => ({
                                    text: `${label} (${this.formatDuration(data.datasets[0].data[i])})`,
                                    fillStyle: colors[i],
                                    index: i
                                }));
                            },
                            padding: 10,
                            usePointStyle: true,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((acc, curr) => acc + curr, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return ` ${context.label}: ${this.formatDuration(value)} (${percentage}%)`;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Application Usage',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                }
            }
        });
    }

    createTimelineVisualization() {
        console.log("Creating timeline"); // Debug log
        const margin = {top: 20, right: 20, bottom: 30, left: 150};
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select("#timeline")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const timeExtent = d3.extent(
            this.processedData.flatMap(app => 
                app.sessions.flatMap(s => [s.start, s.end])
            )
        );

        const xScale = d3.scaleTime()
            .domain(timeExtent)
            .range([0, width]);

        const yScale = d3.scaleBand()
            .domain(this.processedData.map(d => d.appName))
            .range([0, height])
            .padding(0.1);

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append("g")
            .call(d3.axisLeft(yScale));

        this.processedData.forEach((app, index) => {
            svg.selectAll(`.bar-${index}`)
                .data(app.sessions)
                .enter()
                .append("rect")
                .attr("class", `bar-${index}`)
                .attr("y", yScale(app.appName))
                .attr("x", d => xScale(d.start))
                .attr("width", d => Math.max(xScale(d.end) - xScale(d.start), 1))
                .attr("height", yScale.bandwidth())
                .attr("fill", d3.schemeCategory10[index % 10])
                .append("title")
                .text(d => `Duration: ${this.formatDuration(d.duration)}`);
        });
    }

    calculateProductivityScore() {
        const appCategories = {
            highlyProductive: ['code', 'cursor', 'terminal', 'git', 'intellij', 'vscode'],
            productive: ['word', 'excel', 'powerpoint', 'notion', 'slack', 'teams'],
            neutral: ['chrome', 'firefox', 'brave', 'explorer'],
            distracting: ['youtube', 'netflix', 'spotify', 'games'],
            highlyDistracting: ['facebook', 'instagram', 'twitter', 'tiktok']
        };

        let score = 0;
        const hourlyWeight = this.getHourlyWeights(); // Weight based on time of day

        this.processedData.forEach(app => {
            const appName = app.appName.toLowerCase();
            const timeInHours = app.totalTime / 3600;
            let multiplier = 0;

            if (appCategories.highlyProductive.some(p => appName.includes(p))) multiplier = 2;
            else if (appCategories.productive.some(p => appName.includes(p))) multiplier = 1;
            else if (appCategories.neutral.some(p => appName.includes(p))) multiplier = 0;
            else if (appCategories.distracting.some(p => appName.includes(p))) multiplier = -1;
            else if (appCategories.highlyDistracting.some(p => appName.includes(p))) multiplier = -2;

            app.sessions.forEach(session => {
                const hour = session.start.hour();
                score += (session.duration / 3600) * multiplier * hourlyWeight[hour];
            });
        });

        return Math.max(0, Math.round(score * 10)); // Scale to 0-100
    }

    getHourlyWeights() {
        // Higher weights during typical productive hours
        const weights = Array(24).fill(1);
        const productiveHours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
        const lateHours = [23, 0, 1, 2, 3, 4];
        
        productiveHours.forEach(hour => weights[hour] = 1.5);
        lateHours.forEach(hour => weights[hour] = 0.5);
        
        return weights;
    }

    calculateFocusScore() {
        const longSessions = this.processedData.flatMap(app => 
            app.sessions.filter(s => s.duration > 300) // Sessions longer than 5 minutes
        ).length;
        
        const totalSessions = this.processedData.reduce((sum, app) => 
            sum + app.sessionsCount, 0
        );
        
        return Math.round((longSessions / totalSessions) * 100);
    }

    calculateWorkLifeBalance() {
        // Define work hours for each day of the week (0 = Sunday, 6 = Saturday)
        const workSchedule = {
            0: { isWorkDay: false }, // Sunday
            1: { isWorkDay: true, workHours: { start: 9, end: 18 } }, // Monday
            2: { isWorkDay: true, workHours: { start: 9, end: 18 } }, // Tuesday
            3: { isWorkDay: true, workHours: { start: 9, end: 18 } }, // Wednesday
            4: { isWorkDay: true, workHours: { start: 9, end: 18 } }, // Thursday
            5: { isWorkDay: true, workHours: { start: 9, end: 18 } }, // Friday
            6: { isWorkDay: false }  // Saturday
        };

        // Define productive/work apps
        const workApps = [
            'code', 'visual studio', 'intellij', 'pycharm', 
            'git', 'github', 'terminal', 'cmd', 'powershell',
            'word', 'excel', 'powerpoint', 'outlook',
            'teams', 'slack', 'zoom', 'chrome', 'firefox', 'edge', 'brave','cursor'
        ];

        let workTime = 0;
        let personalTime = 0;

        this.processedData.forEach(app => {
            app.sessions.forEach(session => {
                const day = session.start.day();
                const hour = session.start.hour();
                const isWorkApp = workApps.some(workApp => 
                    app.appName.toLowerCase().includes(workApp));

                // Check if it's during work hours on a workday
                if (workSchedule[day].isWorkDay && 
                    hour >= workSchedule[day].workHours?.start && 
                    hour < workSchedule[day].workHours?.end) {
                    if (isWorkApp) {
                        workTime += session.duration;
                    } else {
                        personalTime += session.duration;
                    }
                } else {
                    // Outside work hours
                    personalTime += session.duration;
                }
            });
        });

        // Calculate metrics
        const totalTime = workTime + personalTime;
        const workPercentage = (workTime / totalTime) * 100;
        const personalPercentage = (personalTime / totalTime) * 100;

        return {
            workTime: this.formatDuration(workTime),
            personalTime: this.formatDuration(personalTime),
            workPercentage: Math.round(workPercentage),
            personalPercentage: Math.round(personalPercentage),
            status: this.getWorkLifeStatus(workPercentage),
            message: this.getBalanceMessage(workPercentage)
        };
    }

    getWorkLifeStatus(workPercentage) {
        if (workPercentage > 80) return 'Overworked';
        if (workPercentage > 65) return 'Work-Heavy';
        if (workPercentage > 35) return 'Balanced';
        if (workPercentage > 20) return 'Life-Heavy';
        return 'Mostly Personal';
    }

    getBalanceMessage(workPercentage) {
        if (workPercentage > 80) {
            return 'Consider taking more breaks and personal time';
        } else if (workPercentage > 65) {
            return 'Slightly work-heavy, but within reasonable limits';
        } else if (workPercentage > 35) {
            return 'Good balance between work and personal activities';
        } else if (workPercentage > 20) {
            return 'More personal time than work time';
        } else {
            return 'Mostly personal activities';
        }
    }

    createUsagePatterns() {
        const ctx = document.getElementById('usagePatterns').getContext('2d');
        
        // Calculate hourly usage
        const hourlyData = Array(24).fill(0);
        this.processedData.forEach(app => {
            app.sessions.forEach(session => {
                const hour = session.start.hour();
                hourlyData[hour] += session.duration;
            });
        });

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Usage by Hour',
                    data: hourlyData,
                    borderColor: '#4BC0C0',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Daily Usage Pattern'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return ` Usage by Hour: ${this.formatDuration(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Time (seconds)'
                        }
                    }
                }
            }
        });
    }

    createMultiDimensionalAnalysis() {
        const ctx = document.getElementById('multiAnalysis').getContext('2d');
        
        const datasets = this.processedData.map(app => ({
            label: app.appName.replace('.exe', ''),
            data: [{
                x: app.cpuUsage,
                y: app.memoryUsage,
                r: app.totalTime / 60 // Size based on usage time (minutes)
            }]
        }));

        new Chart(ctx, {
            type: 'bubble',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'CPU vs Memory Usage vs Time'
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'CPU Usage (%)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Memory Usage (%)'
                        }
                    }
                }
            }
        });
    }

    generateInsights() {
        const insights = [];
        
        // Most productive hours
        const productiveHours = this.calculateProductiveHours();
        insights.push({
            type: 'productivity',
            title: 'Peak Productivity Hours',
            message: `You're most productive between ${productiveHours.start}:00 and ${productiveHours.end}:00`
        });

        // App switching patterns
        const switchingRate = this.calculateAppSwitchingRate();
        insights.push({
            type: 'focus',
            title: 'App Switching Pattern',
            message: `You switch applications approximately ${switchingRate} times per hour`
        });

        // Break patterns
        const breakAnalysis = this.analyzeBreaks();
        insights.push({
            type: 'health',
            title: 'Break Analysis',
            message: breakAnalysis.message
        });

        return insights;
    }

    createWeeklyTrends() {
        const ctx = document.getElementById('weeklyTrends').getContext('2d');
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        // Calculate daily totals
        const dailyUsage = Array(7).fill(0);
        this.processedData.forEach(app => {
            app.sessions.forEach(session => {
                const day = session.start.day();
                dailyUsage[day] += session.duration / 3600; // Convert to hours
            });
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: daysOfWeek,
                datasets: [{
                    label: 'Daily Usage (Hours)',
                    data: dailyUsage,
                    backgroundColor: '#4BC0C0'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Weekly Usage Pattern'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return ` ${context.label}: ${this.formatDuration(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Hours'
                        }
                    }
                }
            }
        });
    }


    generateDashboard() {
        // Create metric cards
        document.getElementById('productivityScore').textContent = 
            this.calculateProductivityScore();
        document.getElementById('focusScore').textContent = 
            this.calculateFocusScore() + '%';
        this.updateWorkLifeBalance();

        // Update Quick Summary
        this.updateQuickSummary();

        // Create visualizations
        this.createTimelineVisualization();
        this.createAppUsageDonut();
        this.createUsagePatterns();
        this.createMultiDimensionalAnalysis();

        // Add new visualizations
        this.createWeeklyTrends();
        this.createInteractiveLegend();
        this.addTooltips();

        // Generate and display insights
        const insights = this.generateInsights();
        this.displayInsights(insights);
    }

    calculateProductiveHours() {
        const hourlyProductivity = Array(24).fill(0);
        
        this.processedData.forEach(app => {
            const isProductive = this.isProductiveApp(app.appName);
            app.sessions.forEach(session => {
                const hour = session.start.hour();
                hourlyProductivity[hour] += isProductive ? session.duration : 0;
            });
        });

        const maxHour = hourlyProductivity.indexOf(Math.max(...hourlyProductivity));
        return {
            start: maxHour,
            end: (maxHour + 3) % 24 // Assuming 3-hour productive window
        };
    }

    calculateAppSwitchingRate() {
        const totalSwitches = this.processedData.reduce((sum, app) => 
            sum + app.sessionsCount, 0);
        const totalHours = this.getTotalTimeInHours();
        return Math.round(totalSwitches / totalHours);
    }

    analyzeBreaks() {
        const sessions = this.processedData.flatMap(app => app.sessions)
            .sort((a, b) => a.start - b.start);
        
        const breaks = [];
        for (let i = 1; i < sessions.length; i++) {
            const breakTime = sessions[i].start.diff(sessions[i-1].end, 'minutes');
            if (breakTime > 5) { // Breaks longer than 5 minutes
                breaks.push(breakTime);
            }
        }

        const avgBreak = breaks.reduce((sum, b) => sum + b, 0) / breaks.length;
        return {
            message: `Average break duration: ${this.formatDuration(avgBreak * 60)}. You take approximately ${breaks.length} significant breaks per day.`
        };
    }

    displayInsights(insights) {
        const container = document.querySelector('.grid-cols-3');
        const template = document.getElementById('insight-template');
        
        insights.forEach(insight => {
            const card = template.content.cloneNode(true);
            card.querySelector('.title').textContent = insight.title;
            card.querySelector('.message').textContent = insight.message;
            
            // Add appropriate icon based on insight type
            const icon = card.querySelector('.icon');
            icon.innerHTML = this.getInsightIcon(insight.type);
            
            container.appendChild(card);
        });

        insights.forEach(insight => {
            if (insight.duration) {
                insight.message = insight.message.replace(
                    /(\d+) seconds/g, 
                    (match, seconds) => this.formatDuration(parseInt(seconds))
                );
            }
        });
    }

    // Helper methods
    isProductiveApp(appName) {
        const productiveApps = ['code', 'cursor', 'terminal', 'git'];
        return productiveApps.some(app => 
            appName.toLowerCase().includes(app));
    }

    getTotalTimeInHours() {
        const totalSeconds = this.processedData.reduce((sum, app) => 
            sum + app.totalTime, 0);
        return totalSeconds / 3600;
    }

    getInsightIcon(type) {
        const icons = {
            productivity: '<svg>...</svg>', // Add appropriate SVG icons
            focus: '<svg>...</svg>',
            health: '<svg>...</svg>'
        };
        return icons[type] || '';
    }

    formatDuration(seconds) {
        if (!seconds) return '0m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours === 0) {
            return `${minutes}m`;
        }
        return `${hours}h ${minutes}m`;
    }
    
    formatPercentage(value) {
        return `${Math.round(value)}%`;
    }
    
    formatDateTime(timestamp) {
        return moment(timestamp).format('MMM D, YYYY h:mm A');
    }
    
    updateQuickSummary() {
        console.log("Updating quick summary"); // Debug log
        
        // Total Active Time
        const totalSeconds = this.processedData.reduce((sum, app) => sum + app.totalTime, 0);
        const totalTimeElement = document.getElementById('totalActiveTime');
        if (totalTimeElement) {
            totalTimeElement.textContent = this.formatDuration(totalSeconds);
            console.log("Total time updated:", this.formatDuration(totalSeconds));
        }

        // Most Used App
        const mostUsedApp = this.processedData.reduce((prev, current) => 
            prev.totalTime > current.totalTime ? prev : current
        );
        const mostUsedAppElement = document.getElementById('mostUsedApp');
        if (mostUsedAppElement) {
            mostUsedAppElement.textContent = 
                `${mostUsedApp.appName} (${this.formatDuration(mostUsedApp.totalTime)})`;
            console.log("Most used app updated:", mostUsedApp.appName);
        }
    }

    updateWorkLifeBalance() {
        const balance = this.calculateWorkLifeBalance();
        
        const workLifeElement = document.getElementById('workLifeBalance');
        if (workLifeElement) {
            workLifeElement.innerHTML = `
                <div class="text-lg font-semibold">${balance.status}</div>
                <div class="mt-2">
                    <div class="flex justify-between mb-1">
                        <span>Work: ${balance.workTime} (${balance.workPercentage}%)</span>
                        <span>Personal: ${balance.personalTime} (${balance.personalPercentage}%)</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-blue-600 h-2.5 rounded-full" 
                             style="width: ${balance.workPercentage}%"></div>
                    </div>
                    <p class="text-sm text-gray-600 mt-2">${balance.message}</p>
                </div>
            `;
        }
    }
}

// Load data and initialize

async function init() {
    try {
        console.log("Loading data..."); // Debug log
        const response = await fetch('activity_data.json');
        const data = await response.json();
        console.log("Data loaded:", data); // Debug log
        
        const analytics = new ActivityAnalytics(data);
        analytics.generateDashboard();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('insights').innerHTML = 
            '<div style="color: red;">Error loading activity data</div>';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);
