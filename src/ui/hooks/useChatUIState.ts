import {useState} from 'react';

export function useChatUIState() {
	const [inputValue, setInputValue] = useState('');
	const [showInput, setShowInput] = useState(true);
	const [showLogin, setShowLogin] = useState(false);
	const [showModelSelector, setShowModelSelector] = useState(false);
	const [showProviderSelector, setShowProviderSelector] = useState(false);
	const [showSessionSelector, setShowSessionSelector] = useState(false);
	const [showMCPSelector, setShowMCPSelector] = useState(false);
	const [showLSPSelector, setShowLSPSelector] = useState(false);
	const [showToolSelector, setShowToolSelector] = useState(false);
	const [scrollOffset, setScrollOffset] = useState(0);

	return {
		inputValue,
		setInputValue,
		showInput,
		setShowInput,
		showLogin,
		setShowLogin,
		showModelSelector,
		setShowModelSelector,
		showProviderSelector,
		setShowProviderSelector,
		showSessionSelector,
		setShowSessionSelector,
		showMCPSelector,
		setShowMCPSelector,
		showLSPSelector,
		setShowLSPSelector,
		showToolSelector,
		setShowToolSelector,
		scrollOffset,
		setScrollOffset,
	};
}
