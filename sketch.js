// =================================================================
// 步驟一：模擬成績數據接收
// -----------------------------------------------------------------

// 確保這是全域變數
let finalScore = 0; 
let maxScore = 0;
let scoreText = ""; // 用於 p5.js 繪圖的文字

// 煙火特效相關的全域變數
let fireworks = []; // 儲存煙火物件的陣列
let isFireworkActive = false; // 標記煙火特效是否正在播放

window.addEventListener('message', function (event) {
    // 執行來源驗證...
    // ...
    const data = event.data;
    
    if (data && data.type === 'H5P_SCORE_RESULT') {
        
        // !!! 關鍵步驟：更新全域變數 !!!
        finalScore = data.score; // 更新全域變數
        maxScore = data.maxScore;
        scoreText = `最終成績分數: ${finalScore}/${maxScore}`;
        
        console.log("新的分數已接收:", scoreText); 
        
        // ----------------------------------------
        // 關鍵步驟 2: 呼叫重新繪製 (見方案二)
        // ----------------------------------------
        
        // **新增** 檢查分數是否達到 100% (假設 maxScore > 0)
        if (maxScore > 0 && finalScore / maxScore === 1.0) {
            isFireworkActive = true;
            // 達到 100 分，開始連續播放動畫
            loop(); 
        } else {
            isFireworkActive = false;
            // 如果分數改變但沒有達到 100%，或煙火已經結束，保持 noLoop() 邏輯
            if (typeof redraw === 'function') {
                redraw(); 
            }
        }
    }
}, false);


// =================================================================
// 步驟二：p5.js 核心程式碼
// =================================================================

// --- 煙火粒子系統類別定義 ---

// 粒子 (Particle) 類別
class Particle {
    constructor(x, y, hu, isFirework) {
        this.pos = createVector(x, y);
        this.hu = hu;
        this.lifespan = 255;
        this.isFirework = isFirework; // true: 主火箭的粒子 (有軌跡), false: 爆炸的火花

        if (this.isFirework) {
            // 火箭向上飛行的速度
            this.vel = createVector(0, random(-10, -15));
        } else {
            // 爆炸後火花飛散的速度
            this.vel = p5.Vector.random2D();
            this.vel.mult(random(0.5, 4)); 
        }
        this.acc = createVector(0, 0);
    }

    applyForce(force) {
        this.acc.add(force);
    }

    update() {
        if (!this.isFirework) {
            this.vel.mult(0.95); // 爆炸粒子受空氣阻力減速
            this.lifespan -= 4; // 爆炸粒子生命值減少
        }
        this.vel.add(this.acc);
        this.pos.add(this.vel);
        this.acc.mult(0);
    }

    show() {
        colorMode(HSB);
        if (!this.isFirework) {
            // 爆炸火花
            strokeWeight(2);
            stroke(this.hu, 255, 255, this.lifespan);
        } else {
            // 火箭尾巴
            strokeWeight(4);
            stroke(this.hu, 255, 255);
        }
        point(this.pos.x, this.pos.y);
    }
    
    isDead() {
        return this.lifespan < 0;
    }
}

// 煙火 (Firework) 類別
class Firework {
    constructor(targetX, targetY) {
        this.hu = random(255);
        this.firework = new Particle(random(width), height, this.hu, true); // 從底部發射
        this.exploded = false;
        this.particles = [];
        this.targetY = targetY || random(height / 4, height / 2); // 預設爆炸高度
    }

    update() {
        if (!this.exploded) {
            this.firework.applyForce(createVector(0, 0.2)); // 重力
            this.firework.update();
            
            // 檢查是否到達爆炸點
            if (this.firework.vel.y >= 0 || this.firework.pos.y <= this.targetY) {
                this.explode();
                this.exploded = true;
            }
        }

        // 更新爆炸後的粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].applyForce(createVector(0, 0.2)); // 重力
            this.particles[i].update();
            if (this.particles[i].isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }

    show() {
        if (!this.exploded) {
            this.firework.show();
        }
        for (let particle of this.particles) {
            particle.show();
        }
    }
    
    explode() {
        for (let i = 0; i < 100; i++) { // 產生 100 個爆炸火花
            this.particles.push(new Particle(this.firework.pos.x, this.firework.pos.y, this.hu, false));
        }
    }

    isFinished() {
        return this.exploded && this.particles.length === 0;
    }
}
// --- 類別定義結束 ---


function setup() { 
    createCanvas(windowWidth / 2, windowHeight / 2); 
    colorMode(HSB); // 設置顏色模式方便煙火顏色變化
    background(255); 
    noLoop(); // 預設只在分數改變時重繪
} 

function draw() { 
    // **核心修改：背景增加透明度，以創建煙火的尾跡殘影效果**
    if (isFireworkActive) {
        background(0, 0, 0, 25); // 煙火模式：黑色背景且帶有透明度
    } else {
        background(255); // 非煙火模式：白色背景
    }

    // 計算百分比
    let percentage = (finalScore / maxScore) * 100;
    let scoreDisplayY = height / 2 + 50;

    textSize(80); 
    textAlign(CENTER);
    
    // A. 根據分數區間改變文本顏色和內容
    if (percentage === 100) {
        fill(255, 255, 255); // 煙火模式下文字用白色
        text("滿分！慶祝放煙火！", width / 2, height / 2 - 50);
        
        // **煙火邏輯：如果特效正在播放**
        if (isFireworkActive) {
            // 每隔一段時間或每幾幀發射一個新的煙火 (隨機發射頻率)
            if (random(1) < 0.04) { 
                fireworks.push(new Firework());
            }

            // 更新和顯示所有煙火
            for (let i = fireworks.length - 1; i >= 0; i--) {
                fireworks[i].update();
                fireworks[i].show();
                
                // 移除已經完成的煙火
                if (fireworks[i].isFinished()) {
                    fireworks.splice(i, 1);
                }
            }

            // 如果沒有煙火在畫面上，且特效已經啟動過，則停止 loop()
            if (fireworks.length === 0 && frameCount > 60) {
                 // 確保至少播放一段時間
                 isFireworkActive = false;
                 noLoop();
                 redraw(); // 確保回到靜態分數顯示
            }
        }
        scoreDisplayY = height / 2 + 50;
        
    } else if (percentage >= 90) {
        // ... (原有的 90% 以上邏輯)
        fill(0, 200, 50); 
        text("恭喜！優異成績！", width / 2, height / 2 - 50);
        
    } else if (percentage >= 60) {
        // ... (原有的 60% 以上邏輯)
        fill(255, 181, 35); 
        text("成績良好，請再接再厲。", width / 2, height / 2 - 50);
        
    } else if (percentage > 0) {
        // ... (原有的 0% 以上邏輯)
        fill(200, 0, 0); 
        text("需要加強努力！", width / 2, height / 2 - 50);
        
    } else {
        // ... (原有的尚未收到分數邏輯)
        fill(150);
        text(scoreText, width / 2, height / 2);
    }

    // 顯示具體分數
    textSize(50);
    fill(50);
    text(`得分: ${finalScore}/${maxScore}`, width / 2, scoreDisplayY);
    
    
    // B. 根據分數觸發不同的幾何圖形反映 (畫面反映二)
    if (!isFireworkActive) { // 僅在非煙火模式下顯示幾何圖形
        if (percentage >= 90) {
            fill(0, 200, 50, 150);
            noStroke();
            circle(width / 2, height / 2 + 150, 150);
            
        } else if (percentage >= 60) {
            fill(255, 181, 35, 150);
            rectMode(CENTER);
            rect(width / 2, height / 2 + 150, 150, 150);
        }
    }
}
