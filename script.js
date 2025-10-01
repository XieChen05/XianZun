// 数据存储和管理
class PeriodTracker {
    constructor() {
        this.records = this.loadRecords();
        this.currentYear = new Date().getFullYear();
        this.currentMonth = new Date().getMonth();
        this.init();
    }

    // 从localStorage加载记录
    loadRecords() {
        const data = localStorage.getItem('periodRecords');
        return data ? JSON.parse(data) : [];
    }

    // 保存记录到localStorage
    saveRecords() {
        localStorage.setItem('periodRecords', JSON.stringify(this.records));
    }

    // 添加新记录
    addRecord(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // 验证日期
        if (end < start) {
            this.showAlert('结束日期不能早于开始日期！', 'error');
            return false;
        }

        const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        const record = {
            id: Date.now(),
            startDate: startDate,
            endDate: endDate,
            duration: duration
        };

        this.records.unshift(record);
        this.saveRecords();
        this.showAlert('记录添加成功！', 'success');
        return true;
    }

    // 删除记录
    deleteRecord(id) {
        this.records = this.records.filter(record => record.id !== id);
        this.saveRecords();
        this.render();
    }

    // 计算平均周期
    calculateAverageCycle() {
        if (this.records.length < 2) {
            return null;
        }

        const sortedRecords = [...this.records].sort((a, b) => 
            new Date(a.startDate) - new Date(b.startDate)
        );

        let totalCycle = 0;
        let cycleCount = 0;

        for (let i = 1; i < sortedRecords.length; i++) {
            const prevStart = new Date(sortedRecords[i - 1].startDate);
            const currentStart = new Date(sortedRecords[i].startDate);
            const cycleDays = Math.ceil((currentStart - prevStart) / (1000 * 60 * 60 * 24));
            
            if (cycleDays > 0 && cycleDays < 60) { // 合理的周期范围
                totalCycle += cycleDays;
                cycleCount++;
            }
        }

        return cycleCount > 0 ? Math.round(totalCycle / cycleCount) : null;
    }

    // 计算平均经期天数
    calculateAverageDuration() {
        if (this.records.length === 0) {
            return null;
        }

        const totalDuration = this.records.reduce((sum, record) => sum + record.duration, 0);
        return Math.round(totalDuration / this.records.length);
    }

    // 预测下次例假
    predictNextPeriod() {
        if (this.records.length === 0) {
            return null;
        }

        const avgCycle = this.calculateAverageCycle();
        if (!avgCycle) {
            return {
                message: '至少需要两条记录才能进行预测'
            };
        }

        const avgDuration = this.calculateAverageDuration();
        const lastRecord = this.records.reduce((latest, current) => 
            new Date(current.startDate) > new Date(latest.startDate) ? current : latest
        );

        const lastStartDate = new Date(lastRecord.startDate);
        const predictedStartDate = new Date(lastStartDate);
        predictedStartDate.setDate(predictedStartDate.getDate() + avgCycle);

        const predictedEndDate = new Date(predictedStartDate);
        predictedEndDate.setDate(predictedEndDate.getDate() + avgDuration - 1);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((predictedStartDate - today) / (1000 * 60 * 60 * 24));

        return {
            startDate: predictedStartDate,
            endDate: predictedEndDate,
            daysUntil: daysUntil,
            avgCycle: avgCycle,
            avgDuration: avgDuration
        };
    }

    // 计算排卵期
    calculateOvulationPeriod(startDate, cycle) {
        // 排卵期通常在下次例假前14天左右
        const ovulationDay = new Date(startDate);
        ovulationDay.setDate(ovulationDay.getDate() + cycle - 14);
        
        // 排卵期一般持续10天（排卵日前5天到后4天）
        const ovulationStart = new Date(ovulationDay);
        ovulationStart.setDate(ovulationStart.getDate() - 5);
        
        const ovulationEnd = new Date(ovulationDay);
        ovulationEnd.setDate(ovulationEnd.getDate() + 4);
        
        return {
            start: ovulationStart,
            end: ovulationEnd
        };
    }

    // 检查日期是否在某个范围内
    isDateInRange(date, startDate, endDate) {
        const d = new Date(date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        d.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return d >= start && d <= end;
    }

    // 生成日历
    generateCalendar() {
        const year = this.currentYear;
        const month = this.currentMonth;
        
        // 更新月份标题
        document.getElementById('current-month').textContent = `${year}年${month + 1}月`;
        
        // 获取当月第一天和最后一天
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // 获取当月第一天是星期几
        const firstDayOfWeek = firstDay.getDay();
        
        // 获取当月天数
        const daysInMonth = lastDay.getDate();
        
        // 获取上月最后几天
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        
        const calendarGrid = document.getElementById('calendar-grid');
        calendarGrid.innerHTML = '';
        
        // 获取今天的日期
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 获取预测信息
        const prediction = this.predictNextPeriod();
        const avgCycle = this.calculateAverageCycle() || 28;
        
        // 添加上月日期
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            const dayElement = this.createDayElement(day, 'other-month');
            calendarGrid.appendChild(dayElement);
        }
        
        // 添加当月日期
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            currentDate.setHours(0, 0, 0, 0);
            
            const dayElement = this.createDayElement(day);
            
            // 标记今天
            if (currentDate.getTime() === today.getTime()) {
                dayElement.classList.add('today');
            }
            
            // 标记例假期
            let isPeriod = false;
            for (const record of this.records) {
                if (this.isDateInRange(currentDate, record.startDate, record.endDate)) {
                    dayElement.classList.add('has-period');
                    isPeriod = true;
                    break;
                }
            }
            
            // 标记排卵期（如果不是例假期）
            if (!isPeriod && this.records.length > 0) {
                for (const record of this.records) {
                    const ovulation = this.calculateOvulationPeriod(record.startDate, avgCycle);
                    if (this.isDateInRange(currentDate, ovulation.start, ovulation.end)) {
                        dayElement.classList.add('has-ovulation');
                        break;
                    }
                }
            }
            
            // 标记预测日期
            if (prediction && prediction.startDate && !isPeriod) {
                if (this.isDateInRange(currentDate, prediction.startDate, prediction.endDate)) {
                    dayElement.classList.add('has-prediction');
                }
                
                // 标记预测的排卵期
                if (!dayElement.classList.contains('has-prediction')) {
                    const predictionOvulation = this.calculateOvulationPeriod(prediction.startDate, avgCycle);
                    if (this.isDateInRange(currentDate, predictionOvulation.start, predictionOvulation.end)) {
                        dayElement.classList.add('has-ovulation');
                    }
                }
            }
            
            calendarGrid.appendChild(dayElement);
        }
        
        // 添加下月日期
        const remainingDays = 42 - (firstDayOfWeek + daysInMonth);
        for (let day = 1; day <= remainingDays; day++) {
            const dayElement = this.createDayElement(day, 'other-month');
            calendarGrid.appendChild(dayElement);
        }
    }

    // 创建日期元素
    createDayElement(day, className = '') {
        const dayElement = document.createElement('div');
        dayElement.className = `calendar-day ${className}`;
        dayElement.textContent = day;
        return dayElement;
    }

    // 上一个月
    previousMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.generateCalendar();
    }

    // 下一个月
    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.generateCalendar();
    }

    // 格式化日期
    formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 显示提示信息
    showAlert(message, type) {
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;

        const quickAdd = document.querySelector('.quick-add');
        const cardHeader = quickAdd.querySelector('.card-header');
        cardHeader.insertAdjacentElement('afterend', alert);

        setTimeout(() => {
            alert.remove();
        }, 3000);
    }

    // 显示或隐藏提醒
    showReminder(daysUntil) {
        const reminderDiv = document.getElementById('reminder-notification');
        
        // 提前2天或更少时显示提醒
        if (daysUntil >= 0 && daysUntil <= 2) {
            let reminderText = '';
            if (daysUntil === 0) {
                reminderText = '预计例假今天到来，请做好准备';
            } else if (daysUntil === 1) {
                reminderText = '预计例假明天到来，请做好准备';
            } else {
                reminderText = '预计例假后天到来，请做好准备';
            }
            
            reminderDiv.querySelector('.reminder-text p').textContent = reminderText;
            reminderDiv.style.display = 'block';
        } else {
            reminderDiv.style.display = 'none';
        }
    }

    // 渲染预测信息
    renderPrediction() {
        const predictionDiv = document.getElementById('prediction-result');
        const prediction = this.predictNextPeriod();

        if (!prediction) {
            predictionDiv.innerHTML = `
                <div class="card-header">
                    <span class="icon">🌙</span>
                    <h2>下次预测</h2>
                </div>
                <p class="no-data">暂无数据，请先添加记录</p>
            `;
            this.showReminder(-1); // 隐藏提醒
            return;
        }

        if (prediction.message) {
            predictionDiv.innerHTML = `
                <div class="card-header">
                    <span class="icon">🌙</span>
                    <h2>下次预测</h2>
                </div>
                <p class="no-data">${prediction.message}</p>
            `;
            this.showReminder(-1); // 隐藏提醒
            return;
        }

        const startDateStr = this.formatDate(prediction.startDate);
        const endDateStr = this.formatDate(prediction.endDate);
        
        let daysMessage = '';
        let emoji = '🌙';
        if (prediction.daysUntil > 0) {
            daysMessage = `还有 <strong>${prediction.daysUntil}</strong> 天`;
            emoji = prediction.daysUntil <= 3 ? '⚠️' : '🌙';
        } else if (prediction.daysUntil === 0) {
            daysMessage = '<strong>今天</strong>';
            emoji = '💝';
        } else {
            daysMessage = `已过期 ${Math.abs(prediction.daysUntil)} 天`;
            emoji = '⏰';
        }

        predictionDiv.innerHTML = `
            <div class="card-header">
                <span class="icon">${emoji}</span>
                <h2>下次预测</h2>
            </div>
            <div class="prediction-info">
                <p>预计下次例假：${daysMessage}</p>
                <p>开始日期：<strong>${startDateStr}</strong></p>
                <p>结束日期：<strong>${endDateStr}</strong></p>
            </div>
            <div class="cycle-stats">
                <p>平均周期<span class="highlight">${prediction.avgCycle}</span>天</p>
                <p>平均经期<span class="highlight">${prediction.avgDuration}</span>天</p>
            </div>
        `;

        // 显示或隐藏提醒
        this.showReminder(prediction.daysUntil);
    }

    // 渲染历史记录
    renderRecords() {
        const recordsList = document.getElementById('records-list');

        if (this.records.length === 0) {
            recordsList.innerHTML = '<p class="no-data">暂无记录</p>';
            return;
        }

        recordsList.innerHTML = this.records.map(record => `
            <div class="record-item">
                <button class="delete-btn" onclick="tracker.deleteRecord(${record.id})">×</button>
                <h3>📅 ${this.formatDate(record.startDate)}</h3>
                <p>开始：${this.formatDate(record.startDate)}</p>
                <p>结束：${this.formatDate(record.endDate)}</p>
                <p class="duration">持续 ${record.duration} 天</p>
            </div>
        `).join('');
    }

    // 渲染统计信息
    renderStats() {
        const statsContent = document.getElementById('stats-content');
        
        if (this.records.length === 0) {
            statsContent.innerHTML = '<p class="no-data">暂无统计数据</p>';
            return;
        }

        const avgCycle = this.calculateAverageCycle();
        const avgDuration = this.calculateAverageDuration();
        const totalRecords = this.records.length;

        // 计算最短和最长周期
        let minCycle = null;
        let maxCycle = null;
        
        if (avgCycle) {
            const sortedRecords = [...this.records].sort((a, b) => 
                new Date(a.startDate) - new Date(b.startDate)
            );

            const cycles = [];
            for (let i = 1; i < sortedRecords.length; i++) {
                const prevStart = new Date(sortedRecords[i - 1].startDate);
                const currentStart = new Date(sortedRecords[i].startDate);
                const cycleDays = Math.ceil((currentStart - prevStart) / (1000 * 60 * 60 * 24));
                
                if (cycleDays > 0 && cycleDays < 60) {
                    cycles.push(cycleDays);
                }
            }

            if (cycles.length > 0) {
                minCycle = Math.min(...cycles);
                maxCycle = Math.max(...cycles);
            }
        }

        statsContent.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">记录总数</span>
                <span class="stat-value">${totalRecords}<span class="stat-unit">次</span></span>
            </div>
            <div class="stat-item">
                <span class="stat-label">平均周期</span>
                <span class="stat-value">${avgCycle || '-'}<span class="stat-unit">天</span></span>
            </div>
            <div class="stat-item">
                <span class="stat-label">平均经期</span>
                <span class="stat-value">${avgDuration || '-'}<span class="stat-unit">天</span></span>
            </div>
            ${minCycle ? `
            <div class="stat-item">
                <span class="stat-label">最短周期</span>
                <span class="stat-value">${minCycle}<span class="stat-unit">天</span></span>
            </div>
            ` : ''}
            ${maxCycle ? `
            <div class="stat-item">
                <span class="stat-label">最长周期</span>
                <span class="stat-value">${maxCycle}<span class="stat-unit">天</span></span>
            </div>
            ` : ''}
        `;
    }

    // 生成页面智能提示
    async generatePageTips(pageName) {
        const tipCard = document.getElementById(`ai-tip-${pageName}`);
        if (!tipCard) return;

        const tipContent = tipCard.querySelector('.ai-tip-content');
        
        // 收集当前页面的数据
        let contextData = '';
        let tips = [];

        if (pageName === 'calendar') {
            // 日历页面：分析记录和周期
            if (this.records.length === 0) {
                tips.push('🌸 欢迎使用！建议开始记录你的例假周期，这样我就能为你提供更准确的预测和建议。');
            } else {
                const avgCycle = this.calculateAverageCycle();
                const prediction = this.predictNextPeriod();
                
                if (prediction && prediction.daysUntil !== undefined) {
                    if (prediction.daysUntil <= 2 && prediction.daysUntil >= 0) {
                        tips.push(`⚠️ <strong>提醒</strong>：预计例假即将在${prediction.daysUntil === 0 ? '今天' : prediction.daysUntil === 1 ? '明天' : '后天'}到来，建议提前准备卫生用品。`);
                    } else if (prediction.daysUntil > 2 && prediction.daysUntil <= 7) {
                        tips.push(`📅 预计例假还有${prediction.daysUntil}天到来，可以开始注意身体变化。`);
                    }
                }
                
                if (avgCycle && (avgCycle < 21 || avgCycle > 35)) {
                    tips.push(`💡 <strong>注意</strong>：你的平均周期为${avgCycle}天，${avgCycle < 21 ? '偏短' : '偏长'}。如果感到不适，建议咨询医生。`);
                }
            }
        } else if (pageName === 'record') {
            // 记录页面：提示记录建议
            if (this.records.length === 0) {
                tips.push('📝 还没有记录哦！开始添加第一条记录，建立你的健康档案吧。');
            } else if (this.records.length < 3) {
                tips.push(`📊 已有${this.records.length}条记录。建议至少记录3个周期，预测会更准确哦！`);
            } else {
                const lastRecord = this.records[0];
                const lastDate = new Date(lastRecord.endDate);
                const today = new Date();
                const daysSinceEnd = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
                
                if (daysSinceEnd > 40) {
                    tips.push('💭 距离上次记录已经有一段时间了，别忘记及时更新记录哦！');
                }
            }
            tips.push('💡 <strong>小贴士</strong>：准确记录例假开始和结束时间，有助于更好地了解自己的身体规律。');
        } else if (pageName === 'prediction') {
            // 预测页面：分析健康状况
            const prediction = this.predictNextPeriod();
            const avgCycle = this.calculateAverageCycle();
            const avgDuration = this.calculateAverageDuration();
            
            if (prediction && avgCycle) {
                contextData = `用户的平均周期是${avgCycle}天，平均经期${avgDuration}天，距离下次例假还有${prediction.daysUntil}天。`;
                
                // 本地规则生成的提示
                if (avgCycle >= 28 && avgCycle <= 32 && avgDuration >= 3 && avgDuration <= 7) {
                    tips.push('✅ <strong>周期正常</strong>：你的周期和经期天数都在正常范围内，继续保持健康的生活习惯！');
                }
                
                if (prediction.daysUntil <= 7 && prediction.daysUntil >= 0) {
                    tips.push('🌟 <strong>经前期护理</strong>：建议适当运动，保持心情愉悦，避免过度劳累和生冷食物。');
                }
            }
        }

        // 显示本地生成的提示
        if (tips.length > 0) {
            tipContent.innerHTML = tips.map(tip => `<p>${tip}</p>`).join('');
            tipCard.style.display = 'block';
        }
    }

    // 切换页面
    switchPage(pageName) {
        // 移除所有页面的active类
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // 移除所有导航项的active类
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // 激活选中的页面和导航项
        document.getElementById(`page-${pageName}`).classList.add('active');
        document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

        // 生成该页面的智能提示
        if (pageName !== 'ai' && pageName !== 'mine') {
            this.generatePageTips(pageName);
        }
    }

    // 渲染所有内容
    render() {
        this.generateCalendar();
        this.renderPrediction();
        this.renderRecords();
        this.renderStats();
    }

    // AI聊天功能
    async sendMessage(userMessage) {
        const chatMessages = document.getElementById('chat-messages');
        const userInput = document.getElementById('user-input');
        const sendBtn = document.getElementById('send-btn');

        // 添加用户消息到界面
        const userMessageDiv = document.createElement('div');
        userMessageDiv.className = 'message user-message';
        userMessageDiv.innerHTML = `
            <div class="message-avatar">👤</div>
            <div class="message-content">
                <p>${this.escapeHtml(userMessage)}</p>
            </div>
        `;
        chatMessages.appendChild(userMessageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // 禁用输入
        userInput.disabled = true;
        sendBtn.disabled = true;

        // 添加输入中提示
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai-message';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            // 构建上下文提示 - 缩短回复要求以加快速度
            const systemPrompt = `你是一个专业的女性健康助手，专注于月经周期、排卵期、备孕等相关问题。请用温柔、专业的语气回答问题，提供科学的建议。回答要简洁明了，控制在50-100字。重要提示：你的建议仅供参考，不能替代专业医生的诊断。`;

            console.log('发送AI请求:', userMessage);

            const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer sk-bldigxgeljbuzptwrqfpvfsjkmhywwpgpcrkwdhcvqcdbhnt'
                },
                body: JSON.stringify({
                    model: 'deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: userMessage
                        }
                    ],
                    stream: true  // 启用流式响应
                })
            });

            console.log('响应状态:', response.status);

            // 移除输入中提示
            typingDiv.remove();

            // 创建AI回复消息容器
            const aiMessageDiv = document.createElement('div');
            aiMessageDiv.className = 'message ai-message';
            aiMessageDiv.innerHTML = `
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <p></p>
                </div>
            `;
            chatMessages.appendChild(aiMessageDiv);
            const contentP = aiMessageDiv.querySelector('p');

            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const json = JSON.parse(data);
                            if (json.choices && json.choices[0].delta && json.choices[0].delta.content) {
                                fullText += json.choices[0].delta.content;
                                contentP.textContent = fullText;
                                chatMessages.scrollTop = chatMessages.scrollHeight;
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            }

            // 如果没有收到任何内容，显示错误
            if (!fullText) {
                throw new Error('未收到AI回复');
            }

        } catch (error) {
            console.error('AI Error:', error);
            typingDiv.remove();

            // 显示详细错误消息
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message ai-message';
            errorDiv.innerHTML = `
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <p>抱歉，AI服务暂时不可用。</p>
                    <p style="font-size: 0.85em; margin-top: 5px; opacity: 0.8;">错误信息: ${error.message}</p>
                    <p style="font-size: 0.85em; margin-top: 5px;">建议：请稍后再试，或直接咨询专业医生。</p>
                </div>
            `;
            chatMessages.appendChild(errorDiv);
        }

        // 恢复输入
        userInput.disabled = false;
        sendBtn.disabled = false;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 初始化
    init() {
        // 设置默认日期为今天
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('start-date').value = today;
        document.getElementById('end-date').value = today;

        // 添加记录按钮事件
        document.getElementById('add-btn').addEventListener('click', () => {
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;

            if (!startDate || !endDate) {
                this.showAlert('请选择开始和结束日期！', 'error');
                return;
            }

            if (this.addRecord(startDate, endDate)) {
                this.render();
                // 重新生成当前页面的智能提示
                this.generatePageTips('record');
            }
        });

        // 月份导航按钮事件
        document.getElementById('prev-month').addEventListener('click', () => {
            this.previousMonth();
        });

        document.getElementById('next-month').addEventListener('click', () => {
            this.nextMonth();
        });

        // 底部导航栏事件
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const pageName = item.getAttribute('data-page');
                this.switchPage(pageName);
            });
        });

        // AI提示卡片关闭按钮事件
        document.querySelectorAll('.ai-tip-close').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.ai-tip-card').style.display = 'none';
            });
        });

        // AI助手发送按钮事件
        const sendBtn = document.getElementById('send-btn');
        const userInput = document.getElementById('user-input');

        sendBtn.addEventListener('click', () => {
            const message = userInput.value.trim();
            if (message) {
                this.sendMessage(message);
                userInput.value = '';
            }
        });

        // 回车发送
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const message = userInput.value.trim();
                if (message) {
                    this.sendMessage(message);
                    userInput.value = '';
                }
            }
        });

        // 初始渲染
        this.render();
        
        // 初始页面显示智能提示
        this.generatePageTips('calendar');
    }
}

// 创建追踪器实例
const tracker = new PeriodTracker();

