import Head from 'next/head';
import Image from 'next/image';
import styles from '@/styles/Home.module.css';
import { Contract, providers, utils } from 'ethers';
import { useEffect, useRef, useState } from 'react';
import Web3Modal from 'web3modal';
import { NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI } from '@/constants';

export default function Home() {
	const [walletConnected, setWalletConnected] = useState(false);
	const [loading, setLoading] = useState(false);
	const [presaleStarted, setPresaleStarted] = useState(false);
	const [presaleEnded, setPresaleEnded] = useState(false);
	const [isOwner, setIsOwner] = useState(false);
	const [tokenIdsMinted, setTokenIdsMinted] = useState('0');
	const web3ModalRef = useRef();

	const connectWallet = async () => {
		try {
			// Get the provider from web3Modal, which in our case is MetaMask
			// When used for the first time, it prompts the user to connect their wallet
			await getProviderOrSigner();
			setWalletConnected(true);
		} catch (err) {
			console.error(err);
		}
	};

	const getProviderOrSigner = async (needSigner = false) => {
		// Connect to Metamask
		// Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
		const provider = await web3ModalRef.current.connect();
		const web3Provider = new providers.Web3Provider(provider);

		// If user is not connected to the sepolia network, let them know and throw an error
		const { chainId } = await web3Provider.getNetwork();
		if (chainId !== 11155111) {
			window.alert('Change the network to Sepolia');
			throw new Error('Change network to Sepolia');
		}

		if (needSigner) {
			const signer = web3Provider.getSigner();
			return signer;
		}
		return web3Provider;
	};

	const getOwner = async () => {
		try {
			// Get the provider from web3Modal, which in our case is MetaMask
			// No need for the Signer here, as we are only reading state from the blockchain
			const provider = await getProviderOrSigner();
			// We connect to the Contract using a Provider, so we will only
			// have read-only access to the Contract
			const nftContract = new Contract(
				NFT_CONTRACT_ADDRESS,
				NFT_CONTRACT_ABI,
				provider,
			);
			// call the owner function from the contract
			const owner = await nftContract.owner();
			// We will get the signer now to extract the address of the currently connected MetaMask account
			const signer = await getProviderOrSigner(true);
			// Get the address associated to the signer which is connected to  MetaMask
			const address = await signer.getAddress();

			if (address.toLowerCase() === owner.toLowerCase()) {
				setIsOwner(true);
			}
		} catch (err) {
			console.error(err.message);
		}
	};

	const presaleMint = async () => {
		setLoading(true);
		try {
			const signer = await getProviderOrSigner(true);
			//instance of NFT contract
			const nftContract = new Contract(
				NFT_CONTRACT_ADDRESS,
				NFT_CONTRACT_ABI,
				signer,
			);
			//need 0.01 eth and write in wei
			const txn = await nftContract.presaleMint({
				// value: '10000000000000000', in wei
				value: utils.parseEther('0.01'),
				gasLimit: 1 * 10 ** 6,
			});
			//wait for mint
			await txn.wait();
			window.alert('you successfully minted a CryptoDev!');
		} catch (err) {
			console.error(err);
		}
		setLoading(false);
	};

	const publicMint = async () => {
		setLoading(true);
		try {
			const signer = await getProviderOrSigner(true);
			//instance of NFT contract
			const nftContract = new Contract(
				NFT_CONTRACT_ADDRESS,
				NFT_CONTRACT_ABI,
				signer,
			);
			//need 0.01 eth and write in wei
			const txn = await nftContract.mint({
				// value: '10000000000000000', in wei
				value: utils.parseEther('0.01'),
				gasLimit: 1 * 10 ** 6,
			});
			//wait for mint
			await txn.wait();
			window.alert('you successfully minted a CryptoDev!');
		} catch (err) {
			console.error(err);
		}
		setLoading(false);
	};

	const startPresale = async () => {
		try {
			const signer = await getProviderOrSigner(true);

			//instance of NFT contract
			const nftContract = new Contract(
				NFT_CONTRACT_ADDRESS,
				NFT_CONTRACT_ABI,
				signer,
			);

			//transaction
			const txn = await nftContract.startPresale();
			await txn.wait();
			setPresaleStarted(true);
		} catch (err) {
			console.error(err);
		}
	};
	const checkIfPresaleStarted = async () => {
		try {
			//provider if dont need signer, dont change the blockchain
			const provider = await getProviderOrSigner();

			const nftContract = new Contract(
				NFT_CONTRACT_ADDRESS,
				NFT_CONTRACT_ABI,
				provider,
			);
			const isPresaleStarted = await nftContract.presaleStarted();
			if (!presaleStarted) {
				await getOwner();
			}
			setPresaleStarted(isPresaleStarted);
			return isPresaleStarted;
		} catch (err) {
			console.error(err);
			return false;
		}
	};
	const checkIfPresaleEnded = async () => {
		try {
			//provider if dont need signer, dont change the blockchain
			const provider = await getProviderOrSigner();

			const nftContract = new Contract(
				NFT_CONTRACT_ADDRESS,
				NFT_CONTRACT_ABI,
				provider,
			);
			const presaleEndedTime = await nftContract.presaleEnded();
			// _presaleEnded is a Big Number, so we are using the lt(less than function) instead of `<`
			// Date.now() returns the current time in milliseconds and presaleEnded time in seconds
			// We compare if the _presaleEnded timestamp is less than the current time
			// which means presale has ended
			const hasEnded = presaleEndedTime.lt(Math.floor(Date.now() / 1000));
			console.log(`has ended : ${hasEnded}`);
			setPresaleEnded(hasEnded);
		} catch (err) {
			console.error(err);
		}
	};

	const getNumMintedTokens = async () => {
		try {
			const provider = await getProviderOrSigner();

			const nftContract = new Contract(
				NFT_CONTRACT_ADDRESS,
				NFT_CONTRACT_ABI,
				provider,
			);
			const getNum = await nftContract.tokenIds();

			setTokenIdsMinted(getNum.toString());
		} catch (err) {
			console.error(err);
		}
	};

	const onPageLoad = async () => {
		await connectWallet();
		const presaleStarted = await checkIfPresaleStarted();
		if (presaleStarted) {
			await checkIfPresaleEnded();
		}
		await getNumMintedTokens();
		setInterval(async () => {
			await getNumMintedTokens();
		}, 5000);
		setInterval(async () => {
			const presaleStarted = await checkIfPresaleStarted();
			if (presaleStarted) {
				await checkIfPresaleEnded();
			}
		}, 5000);
	};

	useEffect(() => {
		if (!walletConnected) {
			web3ModalRef.current = new Web3Modal({
				network: 'sepolia',
				providerOptions: {},
				disableInjectedProvider: false,
			});
			onPageLoad();
		}
	}, []);

	const RenderButton = () => {
		// If wallet is not connected, return a button which allows them to connect their wallet
		if (!walletConnected) {
			return (
				<button onClick={connectWallet} className={styles.button}>
					Connect your wallet
				</button>
			);
		}

		// If we are currently waiting for something, return a loading button
		if (loading) {
			return <button className={styles.button}>Loading...</button>;
		}

		// If connected user is the owner, and presale hasn't started yet, allow them to start the presale
		if (isOwner && !presaleStarted) {
			return (
				<button className={styles.button} onClick={startPresale}>
					Start Presale!
				</button>
			);
		}

		// If connected user is not the owner but presale hasn't started yet, tell them that
		if (!presaleStarted) {
			return (
				<div>
					<div className={styles.description}>
						Presale hasn&#39;t started!
					</div>
				</div>
			);
		}

		// If presale started, but hasn't ended yet, allow for minting during the presale period
		if (presaleStarted && !presaleEnded) {
			return (
				<div>
					<div className={styles.description}>
						Presale has started!!! If your address is whitelisted, Mint a
						Crypto Dev 🥳
					</div>
					<button className={styles.button} onClick={presaleMint}>
						Presale Mint 🚀
					</button>
				</div>
			);
		}

		// If presale started and has ended, it's time for public minting
		if (presaleStarted && presaleEnded) {
			return (
				<button className={styles.button} onClick={publicMint}>
					Public Mint 🚀
				</button>
			);
		}
	};

	return (
		<div>
			<Head>
				<title>Crypto Devs</title>
				<meta name="description" content="Whitelist-Dapp" />
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<div className={styles.main}>
				<div>
					<h1 className={styles.title}>Welcome to Crypto Devs!</h1>
					<div className={styles.description}>
						It&#39;s an NFT collection for developers in Crypto.
					</div>
					<div className={styles.description}>
						{tokenIdsMinted}/20 have been minted
					</div>

					<RenderButton />
				</div>
				<div>
					<img className={styles.image} src="./main.svg" />
				</div>
			</div>

			<footer className={styles.footer}>
				Made with &#10084; by Crypto Devs
				{isOwner && <p>fuck yeah</p>}
			</footer>
		</div>
	);
}
