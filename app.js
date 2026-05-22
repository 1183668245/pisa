(() => {
  const { ethers } = window;

  const CONFIG = {
    chainIdHex: "0x38",
    chainId: 56,
    chainName: "BNB Smart Chain",
    rpcUrl: "https://rpc.ankr.com/bsc/84faef12e33fca8dbfc2e76e72880d034dbd10a5b1d1f3db6633546ece736b71", // Ankr 专用节点 RPC 链接
    explorer: "https://bscscan.com",
    factoryAddress: "0xA06DeA3ED5376c1D7721EB386AcB8e825eD23873", // 主网暂未部署，留空
    vaultAddress: "0x740434aA941728698Bf5c44cD77d9bfBd1a6256E", // 主网暂未部署，留空
    tokenAddress: "0x4cdcd69251f1a34b27d5f265f364d700027b7777", // 主网暂未部署，留空
  };

  const CONFIG_STORAGE_KEY = `spp:config:${CONFIG.chainId}`;

  function trimOrEmpty(value) {
    return String(value || "").trim();
  }

  function isValidAddress(value) {
    const v = trimOrEmpty(value);
    if (!v) return false;
    try {
      return ethers.isAddress(v);
    } catch (_) {
      return false;
    }
  }

  function loadConfigOverrides() {
    try {
      const saved = JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || "{}");
      if (saved && typeof saved === "object") {
        if (isValidAddress(saved.vaultAddress)) CONFIG.vaultAddress = trimOrEmpty(saved.vaultAddress);
        if (isValidAddress(saved.tokenAddress)) CONFIG.tokenAddress = trimOrEmpty(saved.tokenAddress);
        if (isValidAddress(saved.factoryAddress)) CONFIG.factoryAddress = trimOrEmpty(saved.factoryAddress);
        if (saved.rpcUrl) CONFIG.rpcUrl = trimOrEmpty(saved.rpcUrl);
      }
    } catch (_) {}

    try {
      const q = new URLSearchParams(window.location.search);
      const vault = trimOrEmpty(q.get("vault"));
      const token = trimOrEmpty(q.get("token"));
      const factory = trimOrEmpty(q.get("factory"));
      const rpc = trimOrEmpty(q.get("rpc"));

      if (isValidAddress(vault)) CONFIG.vaultAddress = vault;
      if (isValidAddress(token)) CONFIG.tokenAddress = token;
      if (isValidAddress(factory)) CONFIG.factoryAddress = factory;
      if (rpc) CONFIG.rpcUrl = rpc;
    } catch (_) {}
  }

  function isConfigReady() {
    return isValidAddress(CONFIG.vaultAddress) && isValidAddress(CONFIG.tokenAddress);
  }

  function saveConfig(next) {
    localStorage.setItem(
      CONFIG_STORAGE_KEY,
      JSON.stringify({
        rpcUrl: trimOrEmpty(next.rpcUrl || CONFIG.rpcUrl),
        factoryAddress: trimOrEmpty(next.factoryAddress || CONFIG.factoryAddress),
        vaultAddress: trimOrEmpty(next.vaultAddress || CONFIG.vaultAddress),
        tokenAddress: trimOrEmpty(next.tokenAddress || CONFIG.tokenAddress),
      })
    );
  }

  function openConfigModal() {
    openModal(
      "配置合约地址",
      `
      <p class="section-text">当前未配置或配置了无效地址，前端无法读取链上数据或发送交易。</p>
      <div class="rule-list">
        <p class="subtle">你也可以通过 URL 参数配置：?vault=0x...&token=0x...&factory=0x...&rpc=https://...</p>
      </div>
      <div class="modal-grid">
        <div class="metric-card">
          <span>Vault 地址</span>
          <input id="cfgVault" class="text-input" placeholder="0x..." value="${trimOrEmpty(CONFIG.vaultAddress)}" />
        </div>
        <div class="metric-card">
          <span>Token 地址</span>
          <input id="cfgToken" class="text-input" placeholder="0x..." value="${trimOrEmpty(CONFIG.tokenAddress)}" />
        </div>
        <div class="metric-card">
          <span>Factory 地址（可选）</span>
          <input id="cfgFactory" class="text-input" placeholder="0x..." value="${trimOrEmpty(CONFIG.factoryAddress)}" />
        </div>
        <div class="metric-card">
          <span>RPC（可选）</span>
          <input id="cfgRpc" class="text-input" placeholder="https://..." value="${trimOrEmpty(CONFIG.rpcUrl)}" />
        </div>
      </div>
      <div class="inline-actions">
        <button id="cfgSaveBtn" class="primary-btn">保存并刷新</button>
        <button id="cfgCancelBtn" class="ghost-btn">稍后再说</button>
      </div>
    `
    );

    document.getElementById("cfgSaveBtn")?.addEventListener("click", () => {
      const vaultAddress = trimOrEmpty(document.getElementById("cfgVault")?.value);
      const tokenAddress = trimOrEmpty(document.getElementById("cfgToken")?.value);
      const factoryAddress = trimOrEmpty(document.getElementById("cfgFactory")?.value);
      const rpcUrl = trimOrEmpty(document.getElementById("cfgRpc")?.value);

      if (!isValidAddress(vaultAddress) || !isValidAddress(tokenAddress)) {
        showToast("请填写有效的 Vault / Token 地址", "error");
        return;
      }

      saveConfig({ vaultAddress, tokenAddress, factoryAddress, rpcUrl });
      window.location.reload();
    });

    document.getElementById("cfgCancelBtn")?.addEventListener("click", closeModal);
  }

  const ZERO = "0x0000000000000000000000000000000000000000";
  const BLIND_BOX_COST = ethers.parseEther("100000");

  const ITEM_META = [
    { id: 0, key: "D80", label: "余温餐券", desc: "下次接手切片位时，仅对溢价部分按 8 折计算。", tab: "discounts", action: "discount" },
    { id: 1, key: "D70", label: "热切餐券", desc: "下次接手切片位时，仅对溢价部分按 7 折计算。", tab: "discounts", action: "discount" },
    { id: 2, key: "D60", label: "精选餐券", desc: "下次接手切片位时，仅对溢价部分按 6 折计算。", tab: "discounts", action: "discount" },
    { id: 3, key: "D50", label: "传说餐券", desc: "下次接手切片位时，仅对溢价部分按 5 折计算。", tab: "discounts", action: "discount" },
    { id: 4, key: "B10", label: "加芝士", desc: "当前切片位份量系数 +10%，持续 60 分钟。", tab: "buffs", action: "buff" },
    { id: 5, key: "B20", label: "秘制酱", desc: "当前切片位份量系数 +20%，持续 60 分钟。", tab: "buffs", action: "buff" },
    { id: 6, key: "B30", label: "高温石炉", desc: "当前切片位份量系数 +30%，持续 60 分钟。", tab: "buffs", action: "buff" },
    { id: 7, key: "B50", label: "爆单时段", desc: "当前切片位份量系数 +50%，持续 30 分钟。", tab: "buffs", action: "buff" },
    { id: 8, key: "B100", label: "全城热搜", desc: "当前切片位份量系数 +100%，持续 30 分钟。", tab: "buffs", action: "buff" },
    { id: 9, key: "P5", label: "祖传面团", desc: "永久份量系数 +5%。", tab: "marks", action: "mark" },
    { id: 10, key: "P8", label: "主厨认证", desc: "永久份量系数 +8%。", tab: "marks", action: "mark" },
    { id: 11, key: "P15", label: "招牌配方", desc: "永久份量系数 +15%。", tab: "marks", action: "mark" },
    { id: 12, key: "P25", label: "传奇店招", desc: "永久份量系数 +25%。", tab: "marks", action: "mark" }
  ];

  const vaultAbi = [
    "function description() view returns (string)",
    "function blindBoxPool() view returns (uint256)",
    "function accumulatedBnbTax() view returns (uint256)",
    "function lastDistributionTime() view returns (uint256)",
    "function seats(uint256) view returns (address owner,uint256 currentPrice,uint256 paidAmount,uint256 occupyTime,uint256 baseWeight,uint256 tempBuffWeight,uint256 tempBuffExpiry,uint256 lastWeightUpdate)",
    "function players(address) view returns (uint256 seatIdPlusOne,uint256 permBuffWeight,uint256 activeDiscount,uint256 pendingBNB,uint256 unclaimedNTM)",
    "function backpackTokenRewards(address) view returns (uint256)",
    "function inventory(address,uint8) view returns (uint256)",
    "function takeSeat(uint256 id)",
    "function exitSeat()",
    "function buyBlindBox()",
    "function claim()",
    "function triggerBnbDistribution()",
    "function claimBackpackTokenRewards()",
    "function useDiscount(uint8 item)",
    "function useBuff(uint8 item)",
    "function usePermanentBuff(uint8 item)"
  ];

  const tokenAbi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner,address spender) view returns (uint256)",
    "function approve(address spender,uint256 amount) returns (bool)"
  ];

  const state = {
    currentFilter: "all",
    drawerTab: "rewards",
    seatsIntroEntered: true,
    seatsEntering: false,
    readProvider: null,
    injectedProvider: null,
    browserProvider: null,
    signer: null,
    readVault: null,
    readToken: null,
    writeVault: null,
    writeToken: null,
    userAddress: null,
    tokenMeta: { name: "--", symbol: "--", decimals: 18 },
    publicData: {
      description: "",
      blindBoxPool: 0n,
      accumulatedBnbTax: 0n,
      lastDistributionTime: 0,
      seats: []
    },
    userData: null,
    selectedSeatId: null,
    isSubmitting: false
  };

  const el = {
    connectWalletBtn: document.getElementById("connectWalletBtn"),
    contractInfoBtn: document.getElementById("contractInfoBtn"),
    footerContractBtn: document.getElementById("footerContractBtn"),
    openBlindBoxModalBtn: document.getElementById("openBlindBoxModalBtn"),
    openMyModalBtn: document.getElementById("openMyModalBtn"),
    openRulesBtn: document.getElementById("openRulesBtn"),
    refreshBtn: document.getElementById("refreshBtn"),
    heroBnbPool: document.getElementById("heroBnbPool"),
    heroBlindBoxPool: document.getElementById("heroBlindBoxPool"),
    heroOccupiedSeats: document.getElementById("heroOccupiedSeats"),
    heroNextSettlement: document.getElementById("heroNextSettlement"),
    tokenMetaText: document.getElementById("tokenMetaText"),
    seatFilterText: document.getElementById("seatFilterText"),
    lastUpdatedText: document.getElementById("lastUpdatedText"),
    seatsOverview: document.getElementById("seatsOverview"),
    seatsOverviewStage: document.getElementById("seatsOverviewStage"),
    seatsCardsView: document.getElementById("seatsCardsView"),
    seatsEnterFx: document.getElementById("seatsEnterFx"),
    seatsEnterText: document.getElementById("seatsEnterText"),
    seatsGrid: document.getElementById("seatsGrid"),
    recentRecords: document.getElementById("recentRecords"),
    modalBackdrop: document.getElementById("modalBackdrop"),
    modalTitle: document.getElementById("modalTitle"),
    modalBody: document.getElementById("modalBody"),
    closeModalBtn: document.getElementById("closeModalBtn"),
    drawer: document.getElementById("drawer"),
    closeDrawerBtn: document.getElementById("closeDrawerBtn"),
    drawerContent: document.getElementById("drawerContent"),
    statusToast: document.getElementById("statusToast"),
    loadingOverlay: document.getElementById("loadingOverlay"),
    loadingTitle: document.getElementById("loadingTitle"),
    loadingText: document.getElementById("loadingText")
  };

  function shortAddr(value) {
    if (!value || value === ZERO) return "未占领";
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  }

  function formatToken(value) {
    const raw = ethers.formatUnits(value, state.tokenMeta.decimals);
    return raw.split(".")[0];
  }

  function formatBnb(value) {
    return `${ethers.formatEther(value)} BNB`;
  }

  function zoneInfo(id) {
    if (id < 10) return { key: "core", name: "热切区" };
    if (id < 40) return { key: "mid", name: "热门区" };
    return { key: "outer", name: "余温区" };
  }

  function countdownText(seat) {
    if (!seat.occupied || !seat.isCooling) return "可接手";
    const remain = Math.max(0, seat.cooldownEndTime - Math.floor(Date.now() / 1000));
    const m = Math.floor(remain / 60);
    const s = remain % 60;
    return `${m}分 ${s}秒`;
  }

  function nowText() {
    return new Date().toLocaleString("zh-CN");
  }

  function occupiedSeatCount() {
    return state.publicData.seats.filter((seat) => seat.occupied).length;
  }

  function parseError(error) {
    const msg = (
      error?.reason ||
      error?.shortMessage ||
      error?.info?.error?.message ||
      error?.message ||
      "交易失败"
    );
    
    // 拦截 ethers.js 常见的解析错误（通常由于 RPC 延迟或非标 ABI 导致，不影响实际上链结果）
    if (typeof msg === "string" && msg.includes("could not coalesce error")) {
      return "操作已执行（节点状态同步中）";
    }
    
    return msg;
  }

  function showToast(message, type = "normal") {
    el.statusToast.textContent = message;
    el.statusToast.className = `status-toast ${type === "normal" ? "" : type}`;
    el.statusToast.classList.remove("hidden");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      el.statusToast.classList.add("hidden");
    }, 3400);
  }

  function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
  }

  function getInjectedProvider() {
    const eth = window.ethereum;
    if (!eth) return null;
    const providers = Array.isArray(eth.providers) ? eth.providers : [eth];
    return providers.find((p) => p.isMetaMask && !p.isTokenPocket) ||
      providers.find((p) => p.isOKXWallet) ||
      providers.find((p) => p.isBinance) ||
      providers.find((p) => p.isCoinbaseWallet) ||
      providers[0] || null;
  }

  function openWalletGuide() {
    const dappPath = `${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
    openModal("打开钱包", `
      <p class="section-text">移动端请尽量使用钱包内置 DApp 浏览器打开当前页面，再进行连接与签名。</p>
      <div class="inline-actions">
        <a class="primary-btn" href="https://metamask.app.link/dapp/${dappPath}" target="_blank" rel="noopener noreferrer">MetaMask 打开</a>
        <a class="ghost-btn" href="https://www.okx.com/download" target="_blank" rel="noopener noreferrer">OKX 钱包</a>
        <a class="ghost-btn" href="https://www.binance.com/zh-CN/web3wallet" target="_blank" rel="noopener noreferrer">Binance 钱包</a>
      </div>
      <p class="section-text">如果已安装钱包 App，请优先复制当前链接并在钱包浏览器内打开。</p>
    `);
  }

  function setBusy(active, title = "处理中", text = "请在钱包中确认，并等待链上返回结果。") {
    state.isSubmitting = active;
    el.loadingTitle.textContent = title;
    el.loadingText.textContent = text;
    el.loadingOverlay.classList.toggle("hidden", !active);
    renderActionButtons();
    renderDrawer();
    if (state.selectedSeatId !== null && !el.modalBackdrop.classList.contains("hidden")) {
      openSeatDetail(state.selectedSeatId);
    }
  }

  function setWalletButtonText() {
    el.connectWalletBtn.textContent = state.userAddress ? shortAddr(state.userAddress) : "连接钱包";
  }

  function needsApproval(amount) {
    return !state.userData || state.userData.allowance < amount;
  }

  function getSeatPayAmount(seat) {
    const current = seat.currentPrice;
    if (!seat.occupied) return current;
    const nextPrice = (current * 120n) / 100n;
    const premium = nextPrice - current;
    const discount = BigInt(state.userData?.activeDiscount || 100);
    return current + (premium * discount) / 100n;
  }

  function getCurrentSeatId() {
    return state.userData?.seatIdPlusOne ? state.userData.seatIdPlusOne - 1 : -1;
  }

  function getSeatActionState(seat) {
    if (state.isSubmitting) return { label: "交易处理中", disabled: true, reason: "当前有交易正在处理中" };
    if (!state.userAddress) return { label: "连接钱包后接手", disabled: false, reason: "" };
    const mySeatId = getCurrentSeatId();
    if (mySeatId === seat.id) return { label: "我已拿下", disabled: true, reason: "你已持有该切片位" };
    if (mySeatId !== -1) return { label: "已有切片位", disabled: true, reason: "每个地址最多持有一个切片位" };
    if (seat.isCooling) return { label: "余温期不可接手", disabled: true, reason: "该切片位仍在余温期" };
    const payAmount = getSeatPayAmount(seat);
    if (state.userData.balance < payAmount) return { label: "余额不足", disabled: true, reason: "当前代币余额不足" };
    if (needsApproval(payAmount)) return { label: "先授权后接手", disabled: false, reason: "" };
    return { label: "接手该切片位", disabled: false, reason: "" };
  }

  function getBlindBoxActionState() {
    return getBlindBoxPurchaseState(1);
  }

  function getBlindBoxPurchaseState(quantity = 1) {
    const count = Math.max(1, Number(quantity) || 1);
    const totalCost = BLIND_BOX_COST * BigInt(count);
    if (state.isSubmitting) return { label: "交易处理中", disabled: true, reason: "当前有交易正在处理中" };
    if (!state.userAddress) return { label: count > 1 ? "连接钱包后批量开启" : "连接钱包后开启", disabled: false, reason: "" };
    if (state.userData.balance < totalCost) return { label: "余额不足", disabled: true, reason: `当前余额不足以开启 ${count} 盒` };
    if (needsApproval(totalCost)) return { label: count > 1 ? "先授权后批量开启" : "先授权后开启", disabled: false, reason: "" };
    return { label: count > 1 ? `开启 ${count} 盒` : "开启配方盒", disabled: false, reason: "" };
  }

  function getClaimActionState() {
    const canClaim = state.userData && (state.userData.pendingBNB > 0n || state.userData.unclaimedNTM > 0n || state.userData.backpackTokenRewards > 0n);
    if (state.isSubmitting) return { label: "交易处理中", disabled: true, reason: "当前有交易正在处理中" };
    if (!state.userAddress) return { label: "连接钱包后领取", disabled: false, reason: "" };
    if (!canClaim) return { label: "暂无可领取", disabled: true, reason: "当前没有可领取回馈" };
    return { label: "领取回馈", disabled: false, reason: "" };
  }

  function getDistributionActionState() {
    if (state.isSubmitting) return { label: "交易处理中", disabled: true, reason: "当前有交易正在处理中", canTrigger: false };
    if (!state.userAddress) return { label: "连接钱包后同步回馈", disabled: false, reason: "", canTrigger: false };
    if (state.publicData.accumulatedBnbTax <= 0n) return { label: "同步回馈", disabled: false, reason: "当前回馈池为空，仅刷新链上状态", canTrigger: false };
    const nextTime = state.publicData.lastDistributionTime + 1800;
    const now = Math.floor(Date.now() / 1000);
    if (now < nextTime) return { label: "同步回馈", disabled: false, reason: `尚未到结算时间，先刷新状态`, canTrigger: false };
    return { label: "同步并结算回馈", disabled: false, reason: "", canTrigger: true };
  }

  function applyButtonState(button, actionState) {
    if (!button) return;
    button.textContent = actionState.label;
    button.disabled = actionState.disabled;
    button.title = actionState.reason || "";
  }

  function normalizeSeat(raw, id) {
    const zone = zoneInfo(id);
    const occupyTime = Number(raw.occupyTime);
    const occupied = raw.owner !== ZERO;
    const cooldownEndTime = occupyTime + 1800;
    const isCooling = occupied && Math.floor(Date.now() / 1000) < cooldownEndTime;

    return {
      id,
      zoneKey: zone.key,
      zoneName: zone.name,
      owner: raw.owner,
      currentPrice: raw.currentPrice,
      paidAmount: raw.paidAmount,
      occupyTime,
      baseWeight: Number(raw.baseWeight),
      tempBuffWeight: Number(raw.tempBuffWeight),
      tempBuffExpiry: Number(raw.tempBuffExpiry),
      lastWeightUpdate: Number(raw.lastWeightUpdate),
      occupied,
      cooldownEndTime,
      isCooling
    };
  }

  async function ensureChain(provider = state.injectedProvider || getInjectedProvider()) {
    if (!provider) throw new Error("未检测到钱包");
    const currentChain = await provider.request({ method: "eth_chainId" });
    if (currentChain === CONFIG.chainIdHex) return;

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CONFIG.chainIdHex }]
      });
    } catch (switchError) {
      if (switchError.code !== 4902) throw switchError;
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CONFIG.chainIdHex,
          chainName: CONFIG.chainName,
          nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
          rpcUrls: [CONFIG.rpcUrl],
          blockExplorerUrls: [CONFIG.explorer]
        }]
      });
    }
  }

  async function connectWallet(silent = false) {
    const provider = getInjectedProvider();
    state.injectedProvider = provider;
    if (!provider) {
      if (!silent && isMobileDevice()) return openWalletGuide();
      if (!silent) showToast("请在钱包浏览器中打开，或安装 MetaMask / OKX / Binance 钱包", "error");
      return;
    }

    try {
      await ensureChain(provider);
      const method = silent ? "eth_accounts" : "eth_requestAccounts";
      const accounts = await provider.request({ method });
      if (!accounts.length) return;

      state.browserProvider = new ethers.BrowserProvider(provider);
      state.signer = await state.browserProvider.getSigner();
      state.userAddress = accounts[0];
      state.writeVault = new ethers.Contract(CONFIG.vaultAddress, vaultAbi, state.signer);
      state.writeToken = new ethers.Contract(CONFIG.tokenAddress, tokenAbi, state.signer);

      setBusy(true, "连接钱包", "请在钱包中确认连接请求。");
      setWalletButtonText();
      await loadUserData();
      renderMyPanel();
      renderSeats();
      renderDrawer();
      showToast("钱包已连接", "success");
    } catch (error) {
      const msg = parseError(error);
      const isSyncMsg = msg === "操作已执行（节点状态同步中）";
      if (!silent) showToast(msg, isSyncMsg ? "success" : "error");
    } finally {
      setBusy(false);
    }
  }

  async function loadTokenMeta() {
    const [name, symbol, decimals] = await Promise.all([
      state.readToken.name(),
      state.readToken.symbol(),
      state.readToken.decimals()
    ]);

    state.tokenMeta = {
      name,
      symbol,
      decimals: Number(decimals)
    };
  }

  async function loadPublicData() {
    const [description, blindBoxPool, accumulatedBnbTax, lastDistributionTime] = await Promise.all([
      state.readVault.description(),
      state.readVault.blindBoxPool(),
      state.readVault.accumulatedBnbTax(),
      state.readVault.lastDistributionTime()
    ]);

    const rawSeats = await Promise.all(
      Array.from({ length: 100 }, (_, i) => state.readVault.seats(i))
    );

    state.publicData = {
      description,
      blindBoxPool,
      accumulatedBnbTax,
      lastDistributionTime: Number(lastDistributionTime),
      seats: rawSeats.map((seat, i) => normalizeSeat(seat, i))
    };
  }

  async function loadUserData() {
    if (!state.userAddress) {
      state.userData = null;
      return;
    }

    const [player, backpackTokenRewards, balance, allowance, inventoryCounts] = await Promise.all([
      state.readVault.players(state.userAddress),
      state.readVault.backpackTokenRewards(state.userAddress),
      state.readToken.balanceOf(state.userAddress),
      state.readToken.allowance(state.userAddress, CONFIG.vaultAddress),
      Promise.all(ITEM_META.map((item) => state.readVault.inventory(state.userAddress, item.id)))
    ]);

    state.userData = {
      seatIdPlusOne: Number(player.seatIdPlusOne),
      permBuffWeight: Number(player.permBuffWeight),
      activeDiscount: Number(player.activeDiscount),
      pendingBNB: player.pendingBNB,
      unclaimedNTM: player.unclaimedNTM,
      backpackTokenRewards,
      balance,
      allowance,
      inventoryCounts
    };
  }

  async function loadAll() {
    await loadPublicData();
    if (state.userAddress) {
      await loadUserData();
    }
    renderAll();
  }

  function renderHero() {
    el.heroBnbPool.textContent = formatBnb(state.publicData.accumulatedBnbTax);
    el.heroBlindBoxPool.textContent = formatToken(state.publicData.blindBoxPool);
    el.heroOccupiedSeats.textContent = `${occupiedSeatCount()} / 100`;
    if(el.blindBoxPoolText) el.blindBoxPoolText.textContent = formatToken(state.publicData.blindBoxPool);
    el.tokenMetaText.textContent = "披萨代币";
    el.lastUpdatedText.textContent = nowText();

    const nextTime = state.publicData.lastDistributionTime + 1800;
    const now = Math.floor(Date.now() / 1000);
    const remain = nextTime - now;
    if (!el.heroNextSettlement) return;
    if (remain <= 0) {
      el.heroNextSettlement.textContent = "可结算";
      return;
    }
    const m = Math.floor(remain / 60);
    const s = remain % 60;
    el.heroNextSettlement.textContent = `${m}分 ${String(s).padStart(2, "0")}秒`;
  }

  function seatFilterLabel(filter) {
    const map = {
      all: "全部切片",
      core: "热切区",
      mid: "热门区",
      outer: "余温区",
      available: "仅看可接手",
      mine: "仅看我的"
    };
    return map[filter] || "全部切片";
  }

  function setSeatFilter(filter) {
    state.currentFilter = filter;
    document.querySelectorAll(".chip").forEach((item) => item.classList.toggle("active", item.dataset.filter === filter));
    renderSeats();
  }

  function enterSeatZone(filter) {
    setSeatFilter(filter);
  }

  function getFilteredSeats() {
    const seats = state.publicData.seats;
    const mySeatId = state.userData?.seatIdPlusOne ? state.userData.seatIdPlusOne - 1 : -1;

    switch (state.currentFilter) {
      case "core": return seats.filter((seat) => seat.zoneKey === "core");
      case "mid": return seats.filter((seat) => seat.zoneKey === "mid");
      case "outer": return seats.filter((seat) => seat.zoneKey === "outer");
      case "available": return seats.filter((seat) => !seat.occupied || !seat.isCooling);
      case "mine": return seats.filter((seat) => seat.id === mySeatId);
      default: return seats;
    }
  }

  function renderSeats() {
    renderHero();

    const seats = getFilteredSeats();
    const mySeatId = state.userData?.seatIdPlusOne ? state.userData.seatIdPlusOne - 1 : -1;
    el.seatFilterText.textContent = seatFilterLabel(state.currentFilter);

    if (!seats.length) {
      el.seatsGrid.innerHTML = `<tr><td colspan="6" class="empty-cell">当前筛选下暂无可查看的切片位。</td></tr>`;
      return;
    }

    el.seatsGrid.innerHTML = seats.map((seat) => {
      const statusClass = seat.id === mySeatId ? "mine" : seat.isCooling ? "cooling" : "available";
      const statusText = seat.id === mySeatId ? "我已拿下" : seat.isCooling ? `余温 ${countdownText(seat)}` : "可接手";
      const actionState = getSeatActionState(seat);
      const ownerText = seat.occupied ? shortAddr(seat.owner) : "-";
      return `
        <tr class="seat-row ${seat.zoneKey} ${statusClass}" data-seat-id="${seat.id}" title="${actionState.reason || statusText}">
          <td class="cell-id">#${seat.id}</td>
          <td><span class="zone-tag">${seat.zoneName}</span></td>
          <td class="cell-price">${formatToken(seat.currentPrice)}</td>
          <td>×${seat.baseWeight}</td>
          <td><span class="status-tag ${statusClass}">${statusText}</span></td>
          <td class="cell-owner">${ownerText}</td>
        </tr>`;
    }).join("");
  }

  function renderRecentRecords() {
    const records = [...state.publicData.seats]
      .filter((seat) => seat.occupied && seat.occupyTime > 0)
      .sort((a, b) => b.occupyTime - a.occupyTime)
      .slice(0, 10);

    if (!records.length) {
      el.recentRecords.innerHTML = `<p class="empty-text">当前尚未生成新的接手记录。</p>`;
      return;
    }

    el.recentRecords.innerHTML = records.map((seat) => `
      <div class="record-item">
        <div class="record-top">
          <strong>${shortAddr(seat.owner)}</strong>
          <span>${new Date(seat.occupyTime * 1000).toLocaleString("zh-CN")}</span>
        </div>
        <p class="section-text">已接手 <strong>#${seat.id}</strong> · ${seat.zoneName} · 当前切片位价格 ${formatToken(seat.currentPrice)}</p>
      </div>
    `).join("");
  }

  function renderActionButtons() {
    // 移除了页面上固定的领取和购买按钮
  }

  function renderMyPanel() {
    if (!state.userData) {
      el.myPanel.innerHTML = `
        <div class="my-meta">
          <span>状态</span>
          <strong>未连接钱包</strong>
          <p class="section-text">连接钱包后可读取你的切片位、回馈、配方袋与授权状态。</p>
        </div>
      `;
      return;
    }

    const seatId = state.userData.seatIdPlusOne ? state.userData.seatIdPlusOne - 1 : null;
    const seatText = seatId === null ? "当前无切片位" : `已拿下 #${seatId}`;
    const inventoryCount = state.userData.inventoryCounts.reduce((sum, item) => sum + Number(item), 0);

    const discountText = state.userData.activeDiscount > 0 ? `${state.userData.activeDiscount / 10} 折` : "未激活";

    el.myPanel.innerHTML = `
      <div class="my-meta">
        <span>我的地址</span>
        <strong>${shortAddr(state.userAddress)}</strong>
      </div>
      <div class="my-meta">
        <span>我的$披萨余额</span>
        <strong>${formatToken(state.userData.balance)}</strong>
      </div>
      <div class="my-meta">
        <span>当前授权额度</span>
        <strong>${formatToken(state.userData.allowance)}</strong>
      </div>
      <div class="my-meta">
        <span>当前切片位</span>
        <strong>${seatText}</strong>
      </div>
      <div class="my-meta">
        <span>激活折扣</span>
        <strong>${discountText}</strong>
      </div>
      <div class="my-meta">
        <span>永久份量加成</span>
        <strong>+${state.userData.permBuffWeight}%</strong>
      </div>
      <div class="my-meta">
        <span>待领取回馈（BNB）</span>
        <strong>${formatBnb(state.userData.pendingBNB)}</strong>
      </div>
      <div class="my-meta">
        <span>待领取$披萨</span>
        <strong>${formatToken(state.userData.unclaimedNTM)}</strong>
      </div>
      <div class="my-meta">
        <span>配方袋$披萨奖励</span>
        <strong>${formatToken(state.userData.backpackTokenRewards)}</strong>
      </div>
      <div class="my-meta">
        <span>配方袋物品总数</span>
        <strong>${inventoryCount}</strong>
      </div>
    `;
  }

  function renderDrawer() {
    if (!state.userData) {
      el.drawerContent.innerHTML = `<p class="empty-text">请先连接钱包，再查看你的配方袋与当前状态。</p>`;
      return;
    }

    const items = ITEM_META.filter((item) => {
      const count = Number(state.userData.inventoryCounts[item.id] || 0n);
      if (state.drawerTab === "rewards") return false;
      if (state.drawerTab === "discounts") return item.tab === "discounts" && count > 0;
      if (state.drawerTab === "buffs") return item.tab === "buffs" && count > 0;
      if (state.drawerTab === "marks") return item.tab === "marks" && count > 0;
      return false;
    });

    if (state.drawerTab === "rewards") {
      const hasBackpackReward = state.userData.backpackTokenRewards > 0n;
      const hasBaseReward = state.userData.pendingBNB > 0n || state.userData.unclaimedNTM > 0n;
      el.drawerContent.innerHTML = `
        <div class="item-card">
          <h4>配方袋$披萨奖励</h4>
          <p>当前可领取：${formatToken(state.userData.backpackTokenRewards)}</p>
          <div class="item-actions">
            <button class="primary-btn" title="${hasBackpackReward ? "" : "当前没有可领取的配方袋$披萨奖励"}" ${hasBackpackReward && !state.isSubmitting ? "" : "disabled"} id="claimBackpackRewardBtn">${state.isSubmitting ? "交易处理中" : "领取配方袋奖励"}</button>
          </div>
        </div>
        <div class="item-card">
          <h4>基础待领取奖励</h4>
          <p>待领取 BNB：${formatBnb(state.userData.pendingBNB)}<br/>待领取$披萨：${formatToken(state.userData.unclaimedNTM)}</p>
          <div class="item-actions">
            <button class="ghost-btn" title="${hasBaseReward ? "" : "当前没有可领取奖励"}" ${hasBaseReward && !state.isSubmitting ? "" : "disabled"} id="claimBaseRewardBtn">${state.isSubmitting ? "交易处理中" : "一键领取"}</button>
          </div>
        </div>
      `;
      document.getElementById("claimBackpackRewardBtn")?.addEventListener("click", claimBackpackReward);
      document.getElementById("claimBaseRewardBtn")?.addEventListener("click", claimBaseReward);
      return;
    }

    if (!items.length) {
      el.drawerContent.innerHTML = `<p class="empty-text">当前分组暂无可用物品或可激活状态。</p>`;
      return;
    }

    el.drawerContent.innerHTML = items.map((item) => {
      const count = Number(state.userData.inventoryCounts[item.id]);
      const noSeat = getCurrentSeatId() === -1;
      const buffActiveSeat = getCurrentSeatId() !== -1 ? state.publicData.seats[getCurrentSeatId()] : null;
      const buffActive = !!(buffActiveSeat && buffActiveSeat.tempBuffExpiry > Math.floor(Date.now() / 1000));
      const disabled = state.isSubmitting || count === 0 || (item.action === "discount" && state.userData.activeDiscount > 0) || (item.action === "buff" && (noSeat || buffActive));
      const reason = state.isSubmitting ? "当前有交易正在处理中" : count === 0 ? "当前物品数量为 0" : item.action === "discount" && state.userData.activeDiscount > 0 ? "当前已有激活折扣" : item.action === "buff" && noSeat ? "当前没有切片位，无法使用加料" : item.action === "buff" && buffActive ? "当前已有生效中的加料" : "";
      return `
      <div class="item-card">
        <h4>${item.label} × ${count}</h4>
        <p>${item.desc}</p>
        <div class="item-actions">
          <button class="primary-btn use-item-btn" title="${reason}" data-item-id="${item.id}" data-action="${item.action}" ${disabled ? "disabled" : ""}>${state.isSubmitting ? "交易处理中" : "立即使用"}</button>
        </div>
      </div>`;
    }).join("");

    document.querySelectorAll(".use-item-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const itemId = Number(btn.dataset.itemId);
        const action = btn.dataset.action;
        if (action === "discount") await useDiscount(itemId);
        if (action === "buff") await useBuff(itemId);
        if (action === "mark") await usePermanentBuff(itemId);
      });
    });
  }

  function renderAll() {
    renderHero();
    renderSeats();
    renderRecentRecords();
    renderActionButtons();
    renderDrawer();
  }

  function openModal(title, html) {
    el.modalTitle.textContent = title;
    el.modalBody.innerHTML = html;
    el.modalBackdrop.classList.remove("hidden");
  }

  function closeModal() {
    el.modalBackdrop.classList.add("hidden");
    state.selectedSeatId = null;
  }

  function openDrawer() {
    state.drawerTab = state.drawerTab || "rewards";
    document.querySelectorAll(".drawer-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === state.drawerTab);
    });
    renderDrawer();
    el.drawer.classList.add("open");
  }

  function closeDrawer() {
    el.drawer.classList.remove("open");
  }

  function openSeatDetail(seatId) {
    const seat = state.publicData.seats[seatId];
    state.selectedSeatId = seatId;
    const mySeatId = getCurrentSeatId();
    const payAmount = state.userData ? getSeatPayAmount(seat) : 0n;
    const canExit = mySeatId === seatId && !state.isSubmitting;
    const takeState = getSeatActionState(seat);
    const modalHtml = `
      <div class="modal-grid">
        <div class="metric-card"><span>切片位编号</span><strong>#${seat.id}</strong></div>
        <div class="metric-card"><span>切片区</span><strong>${seat.zoneName}</strong></div>
        <div class="metric-card"><span>当前价格</span><strong>${formatToken(seat.currentPrice)}</strong></div>
        <div class="metric-card"><span>份量系数</span><strong>×${seat.baseWeight}</strong></div>
        <div class="metric-card"><span>当前持有者</span><strong>${shortAddr(seat.owner)}</strong></div>
        <div class="metric-card"><span>当前状态</span><strong>${seat.isCooling ? `余温期 · ${countdownText(seat)}` : "可接手"}</strong></div>
      </div>
      <p class="section-text">预计本次支付：${state.userData ? `${formatToken(payAmount)}` : "连接钱包后显示"}</p>
      <p class="section-text">${takeState.reason || "如果授权不足，前端会先请求授权，再发起正式交易。"}</p>
      <div class="inline-actions">
        <button id="seatTakeBtn" class="primary-btn" title="${takeState.reason || ""}" ${takeState.disabled ? "disabled" : ""}>${takeState.label}</button>
        <button id="seatExitBtn" class="ghost-btn" title="${canExit ? "" : "你未持有该切片位或当前交易处理中"}" ${canExit ? "" : "disabled"}>放回餐桌</button>
      </div>
    `;
    openModal(`切片位 #${seat.id}`, modalHtml);
    document.getElementById("seatTakeBtn")?.addEventListener("click", () => takeSeat(seat.id));
    document.getElementById("seatExitBtn")?.addEventListener("click", exitSeat);
  }

  async function ensureApproval(amount) {
    if (!state.userAddress) await connectWallet();
    if (!state.userData) await loadUserData();
    if (!needsApproval(amount)) return;

    setBusy(true, "授权代币", "请在钱包中确认授权，并等待链上完成确认。");
    showToast("正在发起代币授权，请在钱包中确认");
    const tx = await state.writeToken.approve(CONFIG.vaultAddress, amount);
    await tx.wait();
    showToast("授权成功", "success");
    await loadUserData();
  }

  async function withTx(label, action) {
    if (state.isSubmitting) return;
    setBusy(true, label, `请在钱包中确认${label}，并等待链上完成确认。`);
    try {
      await action();
      await loadAll();
      showToast(`${label}成功`, "success");
      closeModal();
    } catch (error) {
      const msg = parseError(error);
      const isSyncMsg = msg === "操作已执行（节点状态同步中）";
      showToast(msg, isSyncMsg ? "success" : "error");
    } finally {
      setBusy(false);
    }
  }

  async function takeSeat(seatId) {
    if (!state.userAddress) return connectWallet();
    const seat = state.publicData.seats[seatId];
    const payAmount = getSeatPayAmount(seat);

    await withTx("接手切片位", async () => {
      await ensureApproval(payAmount);
      const tx = await state.writeVault.takeSeat(seatId);
      await tx.wait();
    });
  }

  async function buyBlindBox(quantity = 1) {
    if (!state.userAddress) return connectWallet();
    const count = Math.max(1, Number(quantity) || 1);
    const totalCost = BLIND_BOX_COST * BigInt(count);
    const actionState = getBlindBoxPurchaseState(count);
    if (actionState.disabled) {
      if (actionState.reason) showToast(actionState.reason, "error");
      return;
    }
    if (count === 1) {
      await withTx("开启配方盒", async () => {
        await ensureApproval(totalCost);
        const tx = await state.writeVault.buyBlindBox();
        await tx.wait();
      });
      return;
    }
    if (state.isSubmitting) return;
    setBusy(true, "批量开启配方盒", `将连续发起 ${count} 次开启，请在钱包中逐次确认。`);
    try {
      await ensureApproval(totalCost);
      for (let i = 0; i < count; i++) {
        showToast(`请确认第 ${i + 1}/${count} 次配方盒开启`);
        const tx = await state.writeVault.buyBlindBox();
        await tx.wait();
      }
      await loadAll();
      showToast(`已完成 ${count} 盒开启`, "success");
      closeModal();
    } catch (error) {
      const msg = parseError(error);
      const isSyncMsg = msg === "操作已执行（节点状态同步中）";
      showToast(msg, isSyncMsg ? "success" : "error");
    } finally {
      setBusy(false);
    }
  }

  async function exitSeat() {
    if (!state.userAddress) return connectWallet();

    await withTx("放回餐桌", async () => {
      const tx = await state.writeVault.exitSeat();
      await tx.wait();
    });
  }

  async function claimBaseReward() {
    if (!state.userAddress) return connectWallet();

    await withTx("领取回馈", async () => {
      const tx = await state.writeVault.claim();
      await tx.wait();
    });
  }

  async function claimBackpackReward() {
    if (!state.userAddress) return connectWallet();

    await withTx("领取配方袋奖励", async () => {
      const tx = await state.writeVault.claimBackpackTokenRewards();
      await tx.wait();
    });
  }

  async function syncMyRewards() {
    if (!state.userAddress) return connectWallet();

    await loadAll();
    const distributionState = getDistributionActionState();
    if (!distributionState.canTrigger) {
      openMyPanelModal();
      showToast("状态已同步", "success");
      return;
    }

    await withTx("同步并结算回馈", async () => {
      const tx = await state.writeVault.triggerBnbDistribution();
      await tx.wait();
    });
  }

  async function useDiscount(itemId) {
    await withTx("使用折扣券", async () => {
      const tx = await state.writeVault.useDiscount(itemId);
      await tx.wait();
    });
  }

  async function useBuff(itemId) {
    await withTx("使用增益", async () => {
      const tx = await state.writeVault.useBuff(itemId);
      await tx.wait();
    });
  }

  async function usePermanentBuff(itemId) {
    await withTx("激活铭刻", async () => {
      const tx = await state.writeVault.usePermanentBuff(itemId);
      await tx.wait();
    });
  }

  function openRules() {
    window.open("./docs/中本聪披萨协议-基础版机制说明.html", "_blank", "noopener,noreferrer");
  }

  function openPoolInfo() {
    openModal("配方池说明", `
      <div class="pool-info-summary">
        <div class="metric-card"><span>单盒价格</span><strong>100000 $披萨/盒</strong></div>
        <div class="metric-card"><span>代币流向</span><strong>50000 入配方沉淀池 / 50000 销毁</strong></div>
      </div>
      <div class="pool-info-table-wrap">
        <table class="pool-info-table">
          <thead>
            <tr><th>类型</th><th>奖品</th><th>概率</th><th>作用</th></tr>
          </thead>
          <tbody>
            <tr class="pool-group-row"><td colspan="4">代币补给</td></tr>
            <tr><td>代币补给</td><td>10000 $披萨</td><td>25%</td><td>补充基础资源，用于后续接手切片位或继续开盒</td></tr>
            <tr><td>代币补给</td><td>30000 $披萨</td><td>18%</td><td>提升持续参与与资源回流能力</td></tr>
            <tr><td>代币补给</td><td>80000 $披萨</td><td>7%</td><td>接近单盒成本回收，属于中档高感知补给</td></tr>
            <tr><td>代币补给</td><td>200000 $披萨</td><td>2%</td><td>高额代币回报，可直接强化下一轮参与能力</td></tr>
            <tr class="pool-group-row"><td colspan="4">餐券</td></tr>
            <tr><td>餐券</td><td>余温餐券</td><td>18%</td><td>下次接手时，仅对溢价部分按 8 折计算</td></tr>
            <tr><td>餐券</td><td>热切餐券</td><td>10%</td><td>下次接手时，仅对溢价部分按 7 折计算</td></tr>
            <tr><td>餐券</td><td>精选餐券</td><td>5%</td><td>下次接手时，仅对溢价部分按 6 折计算</td></tr>
            <tr><td>餐券</td><td>传说餐券</td><td>1.5%</td><td>下次接手时，仅对溢价部分按 5 折计算</td></tr>
            <tr class="pool-group-row"><td colspan="4">加料（限时）</td></tr>
            <tr><td>加料</td><td>加芝士</td><td>6%</td><td>当前切片位份量系数 +10%，持续 60 分钟</td></tr>
            <tr><td>加料</td><td>秘制酱</td><td>3%</td><td>当前切片位份量系数 +20%，持续 60 分钟</td></tr>
            <tr><td>加料</td><td>高温石炉</td><td>2%</td><td>当前切片位份量系数 +30%，持续 60 分钟</td></tr>
            <tr><td>加料</td><td>爆单时段</td><td>1%</td><td>当前切片位份量系数 +50%，持续 30 分钟</td></tr>
            <tr><td>加料</td><td>全城热搜</td><td>0.3%</td><td>当前切片位份量系数 +100%，持续 30 分钟</td></tr>
            <tr class="pool-group-row"><td colspan="4">幸运暴击</td></tr>
            <tr><td>幸运暴击</td><td>沉淀池暴击</td><td>0.19%</td><td>直接获得当前配方沉淀池 30% 对应的代币奖励，先进配方袋</td></tr>
            <tr class="pool-group-row"><td colspan="4">招牌配方（永久）</td></tr>
            <tr><td>招牌配方</td><td>祖传面团</td><td>0.008%</td><td>永久份量系数 +5%</td></tr>
            <tr><td>招牌配方</td><td>主厨认证</td><td>0.0015%</td><td>永久份量系数 +8%</td></tr>
            <tr><td>招牌配方</td><td>招牌配方</td><td>0.0004%</td><td>永久份量系数 +15%</td></tr>
            <tr><td>招牌配方</td><td>传奇店招</td><td>1.0001%</td><td>永久份量系数 +25%</td></tr>
          </tbody>
        </table>
      </div>
      <p class="batch-hint">以上概率按当前合约实现展示，所有奖项均先进配方袋，再由用户手动领取或使用。</p>
    `);
  }

  function openBlindBoxPanel() {
    const actionState = getBlindBoxPurchaseState(1);
    openModal("披萨配方盒", `
      <p class="section-text">开启披萨配方盒，获得代币补给、餐券、加料与招牌配方。</p>
      <div class="metric-row">
        <div class="metric-card"><span>配方盒价格</span><strong>100000 $披萨/盒</strong></div>
        <div class="metric-card"><span>当前配方沉淀池</span><strong>${formatToken(state.publicData.blindBoxPool)}</strong></div>
      </div>
      <div class="blindbox-batch-bar">
        <span>开启数量</span>
        <select id="blindBoxQtySelect" class="batch-select"><option value="1">1 盒</option><option value="3">3 盒</option><option value="5">5 盒</option><option value="10">10 盒</option></select>
        <strong id="blindBoxTotalCostText" class="batch-total">${formatToken(BLIND_BOX_COST)} $披萨</strong>
      </div>
      <p class="batch-hint">批量开启会连续发起多次链上交易，需要逐次钱包确认。</p>
      <div class="inline-actions">
        <button id="blindBoxModalBuyBtn" class="primary-btn" title="${actionState.reason || ""}" ${actionState.disabled ? "disabled" : ""}>${actionState.label}</button>
        <button id="blindBoxModalInfoBtn" class="ghost-btn">配方池说明</button>
      </div>
    `);
    const qtyEl = document.getElementById("blindBoxQtySelect");
    const totalEl = document.getElementById("blindBoxTotalCostText");
    const buyBtn = document.getElementById("blindBoxModalBuyBtn");
    const syncBlindBoxState = () => {
      const qty = Number(qtyEl?.value || 1);
      const total = BLIND_BOX_COST * BigInt(qty);
      const stateInfo = getBlindBoxPurchaseState(qty);
      if (totalEl) totalEl.textContent = `${formatToken(total)} $披萨`;
      if (buyBtn) {
        buyBtn.textContent = stateInfo.label;
        buyBtn.disabled = stateInfo.disabled;
        buyBtn.title = stateInfo.reason || "";
      }
    };
    qtyEl?.addEventListener("change", syncBlindBoxState);
    buyBtn?.addEventListener("click", () => buyBlindBox(Number(qtyEl?.value || 1)));
    document.getElementById("blindBoxModalInfoBtn")?.addEventListener("click", openPoolInfo);
    syncBlindBoxState();
  }

  function openMyPanelModal() {
    const claimState = getClaimActionState();
    const distributionState = getDistributionActionState();
    if (!state.userData) {
      openModal("我的", `
        <div class="my-modal-empty">
          <strong>未连接钱包</strong>
          <p class="section-text">连接钱包后可查看你的切片位、资产、回馈与配方袋状态。</p>
        </div>
        <div class="inline-actions">
          <button id="myModalConnectBtn" class="primary-btn">连接钱包</button>
        </div>
      `);
      document.getElementById("myModalConnectBtn")?.addEventListener("click", () => connectWallet());
      return;
    }

    const seatId = state.userData.seatIdPlusOne ? state.userData.seatIdPlusOne - 1 : null;
    const seatText = seatId === null ? "当前无切片位" : `已拿下 #${seatId}`;
    const inventoryCount = state.userData.inventoryCounts.reduce((sum, item) => sum + Number(item), 0);
    const discountText = state.userData.activeDiscount > 0 ? `${state.userData.activeDiscount / 10} 折` : "未激活";

    openModal("我的", `
      <div class="my-modal-panel">
        <div class="my-modal-hero">
          <div class="my-modal-identity">
            <span>当前账户</span>
            <strong>${shortAddr(state.userAddress)}</strong>
            <em>${seatText}</em>
          </div>
          <div class="my-modal-balance">
            <span>我的代币余额</span>
            <strong>${formatToken(state.userData.balance)}</strong>
          </div>
        </div>

        <div class="my-modal-grid">
          <div class="my-modal-card"><span>待领取回馈（BNB）</span><strong>${formatBnb(state.userData.pendingBNB)}</strong></div>
          <div class="my-modal-card"><span>待领取$披萨</span><strong>${formatToken(state.userData.unclaimedNTM)}</strong></div>
          <div class="my-modal-card"><span>配方袋$披萨奖励</span><strong>${formatToken(state.userData.backpackTokenRewards)}</strong></div>
          <div class="my-modal-card"><span>配方袋物品总数</span><strong>${inventoryCount}</strong></div>
        </div>

        <div class="my-modal-strip">
          <div class="my-modal-mini"><span>授权额度</span><strong>${formatToken(state.userData.allowance)}</strong></div>
          <div class="my-modal-mini"><span>激活折扣</span><strong>${discountText}</strong></div>
          <div class="my-modal-mini"><span>永久份量</span><strong>+${state.userData.permBuffWeight}%</strong></div>
        </div>
      </div>

      <div class="inline-actions">
        <button id="myModalSyncBtn" class="ghost-btn" title="${distributionState.reason || ""}" ${distributionState.disabled ? "disabled" : ""}>${distributionState.label}</button>
        <button id="myModalClaimBtn" class="primary-btn" title="${claimState.reason || ""}" ${claimState.disabled ? "disabled" : ""}>${claimState.label}</button>
        <button id="myModalBackpackBtn" class="ghost-btn">打开配方袋</button>
      </div>
    `);
    document.getElementById("myModalSyncBtn")?.addEventListener("click", syncMyRewards);
    document.getElementById("myModalClaimBtn")?.addEventListener("click", claimBaseReward);
    document.getElementById("myModalBackpackBtn")?.addEventListener("click", () => {
      closeModal();
      openDrawer();
    });
  }

  function openContractInfo() {
    openModal("合约信息", `
      <div class="rule-list">
        <p>Vault：<a href="${CONFIG.explorer}/address/${CONFIG.vaultAddress}" target="_blank" rel="noreferrer">${CONFIG.vaultAddress}</a></p>
        <p>Token：<a href="${CONFIG.explorer}/address/${CONFIG.tokenAddress}" target="_blank" rel="noreferrer">${CONFIG.tokenAddress}</a></p>
        <p>Factory：<a href="${CONFIG.explorer}/address/${CONFIG.factoryAddress}" target="_blank" rel="noreferrer">${CONFIG.factoryAddress}</a></p>
        <p>当前描述：${state.publicData.description || "加载中..."}</p>
      </div>
    `);
  }

  function bindEvents() {
    el.connectWalletBtn.addEventListener("click", () => connectWallet());
    el.contractInfoBtn.addEventListener("click", openContractInfo);
    el.footerContractBtn.addEventListener("click", openContractInfo);
    el.openBlindBoxModalBtn?.addEventListener("click", openBlindBoxPanel);
    el.openMyModalBtn?.addEventListener("click", openMyPanelModal);
    el.openRulesBtn.addEventListener("click", openRules);
    el.refreshBtn.addEventListener("click", async () => {
      await loadAll();
      showToast("状态已刷新", "success");
    });

    el.closeModalBtn.addEventListener("click", closeModal);
    el.modalBackdrop.addEventListener("click", (event) => {
      if (event.target === el.modalBackdrop) closeModal();
    });

    el.closeDrawerBtn.addEventListener("click", closeDrawer);

    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        setSeatFilter(chip.dataset.filter);
      });
    });

    document.querySelectorAll(".drawer-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        state.drawerTab = tab.dataset.tab;
        document.querySelectorAll(".drawer-tab").forEach((item) => item.classList.remove("active"));
        tab.classList.add("active");
        renderDrawer();
      });
    });

    el.seatsGrid.addEventListener("click", (event) => {
      const card = event.target.closest("[data-seat-id]");
      if (!card) return;
      openSeatDetail(Number(card.dataset.seatId));
    });

    const provider = getInjectedProvider();
    if (provider?.on) {
      provider.on("accountsChanged", async () => {
        await connectWallet(true);
        await loadAll();
      });
      provider.on("chainChanged", () => window.location.reload());
    }
  }

  async function bootstrap() {
    state.readProvider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    state.readVault = new ethers.Contract(CONFIG.vaultAddress, vaultAbi, state.readProvider);
    state.readToken = new ethers.Contract(CONFIG.tokenAddress, tokenAbi, state.readProvider);

    bindEvents();
    await loadTokenMeta();
    await loadAll();
    await connectWallet(true);
    setInterval(loadPublicDataAndRender, 30000);
    setInterval(renderSeats, 1000);
  }

  async function loadPublicDataAndRender() {
    try {
      await loadPublicData();
      if (state.userAddress) await loadUserData();
      renderAll();
    } catch (_) {}
  }

  bootstrap().catch((error) => {
    console.error(error);
    showToast("前端初始化失败，请检查 RPC 或地址配置", "error");
  });
})();
